import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import {
  inventoryDeviceGroups,
  inventoryDevices,
} from "@playbook-runner/db/schema/inventory"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { scripts } from "@playbook-runner/db/schema/scripts"
import { eq, inArray } from "drizzle-orm"
import { decryptSecret } from "#v1/credentials/crypto"

export type RunInventorySelection = {
  id: string
  type: "group" | "device"
}

export type ResolvedRunHost = {
  name: string
  address: string
  port?: number
  username: string
  privateKey: string
  connection: "ssh"
}

export type ResolvedRunBundle = {
  playbook: { name: string; content: string }
  hosts: ResolvedRunHost[]
}

export type ResolvedScriptBundle = {
  script: { name: string; content: string; language: "bash" | "python" }
  hosts: ResolvedRunHost[]
}

/**
 * Derive the host address from a Postgres `cidr` value.
 *
 * The `ip_address` column is typed as `cidr`, so values are returned as
 * "host/prefix" strings (e.g. "192.168.1.10/32"). For Ansible we need just
 * the host portion. If the column is ever populated with a bare IP, we still
 * want to round-trip it without the mask.
 */
function cidrToAddress(value: string): string {
  const slash = value.indexOf("/")
  return slash === -1 ? value : value.slice(0, slash)
}

export async function resolveRun(
  playbookId: string,
  inventory: RunInventorySelection[]
): Promise<ResolvedRunBundle> {
  const playbook = await db
    .select({
      id: playbooks.id,
      name: playbooks.name,
      content: playbooks.content,
    })
    .from(playbooks)
    .where(eq(playbooks.id, playbookId))
    .then((rows) => rows[0] ?? null)

  if (!playbook) {
    throw new ResolveRunNotFoundError(`Playbook ${playbookId} not found`)
  }

  const hosts = await resolveHosts(inventory)

  return {
    playbook: { name: playbook.name, content: playbook.content },
    hosts,
  }
}

/**
 * Resolve a stored script + inventory selection into an executable bundle.
 * Mirrors `resolveRun` but the playbook slot is replaced by the script.
 */
export async function resolveScript(
  scriptId: string,
  inventory: RunInventorySelection[]
): Promise<ResolvedScriptBundle> {
  const script = await db
    .select({
      id: scripts.id,
      name: scripts.name,
      content: scripts.content,
      language: scripts.language,
    })
    .from(scripts)
    .where(eq(scripts.id, scriptId))
    .then((rows) => rows[0] ?? null)

  if (!script) {
    throw new ResolveRunNotFoundError(`Script ${scriptId} not found`)
  }

  const hosts = await resolveHosts(inventory)

  return {
    script: {
      name: script.name,
      content: script.content,
      language: script.language ?? "bash",
    },
    hosts,
  }
}

/**
 * Resolve a single device's connection details for diagnostic-style runs
 * (ping, ad-hoc tasks) that don't go through a stored playbook. Returns
 * the same host shape as `resolveRun` but for exactly one device.
 */
export async function resolveDevice(
  deviceId: string
): Promise<ResolvedRunHost> {
  const rows = await db
    .select({
      deviceId: inventoryDevices.id,
      deviceName: inventoryDevices.name,
      ipAddress: inventoryDevices.ipAddress,
      portSSH: inventoryDevices.portSSH,
      credentialId: inventoryDevices.credentialId,
      username: credentials.username,
      privateKey: credentials.privateKey,
    })
    .from(inventoryDevices)
    .leftJoin(credentials, eq(credentials.id, inventoryDevices.credentialId))
    .where(eq(inventoryDevices.id, deviceId))
    .then((rows) => rows[0] ?? null)

  if (!rows) {
    throw new ResolveRunNotFoundError(`Device ${deviceId} not found`)
  }

  if (!rows.credentialId || !rows.username || !rows.privateKey) {
    throw new ResolveRunCredentiallessError(
      `Device "${rows.deviceName}" has no credential associated`
    )
  }

  return {
    name: rows.deviceName,
    address: cidrToAddress(rows.ipAddress),
    port: rows.portSSH ?? undefined,
    username: rows.username,
    privateKey: decryptSecret(rows.privateKey),
    connection: "ssh" as const,
  }
}

/**
 * Resolve an inventory selection into a de-duplicated list of hosts with
 * credentials. Expands group entries to their member devices, joins the
 * device's credential, and fails fast on missing credentials or unknown
 * device ids. Used by `resolveRun`/`resolveScript` and directly by ad-hoc
 * command runs.
 */
export async function resolveHosts(
  inventory: RunInventorySelection[]
): Promise<ResolvedRunHost[]> {
  const directDeviceIds = inventory
    .filter((sel) => sel.type === "device")
    .map((sel) => sel.id)
  const groupIds = inventory
    .filter((sel) => sel.type === "group")
    .map((sel) => sel.id)

  let groupDeviceIds: string[] = []
  if (groupIds.length > 0) {
    const rows = await db
      .select({ deviceId: inventoryDeviceGroups.deviceId })
      .from(inventoryDeviceGroups)
      .where(inArray(inventoryDeviceGroups.groupId, groupIds))
    groupDeviceIds = rows.map((r) => r.deviceId)
  }

  const deviceIds = Array.from(new Set([...directDeviceIds, ...groupDeviceIds]))
  if (deviceIds.length === 0) {
    throw new ResolveRunValidationError(
      "Selection produced no devices to run against"
    )
  }

  const rows = await db
    .select({
      deviceId: inventoryDevices.id,
      deviceName: inventoryDevices.name,
      ipAddress: inventoryDevices.ipAddress,
      portSSH: inventoryDevices.portSSH,
      credentialId: inventoryDevices.credentialId,
      username: credentials.username,
      privateKey: credentials.privateKey,
    })
    .from(inventoryDevices)
    .leftJoin(credentials, eq(credentials.id, inventoryDevices.credentialId))
    .where(inArray(inventoryDevices.id, deviceIds))

  if (rows.length !== deviceIds.length) {
    const found = new Set(rows.map((r) => r.deviceId))
    const missing = deviceIds.filter((id) => !found.has(id))
    throw new ResolveRunValidationError(
      `Unknown device(s) in selection: ${missing.join(", ")}`
    )
  }

  const credentialless: string[] = []
  const hosts: ResolvedRunHost[] = rows.map((r) => {
    if (!r.credentialId || !r.username || !r.privateKey) {
      credentialless.push(r.deviceName)
      return {
        name: r.deviceName,
        address: cidrToAddress(r.ipAddress),
        port: r.portSSH ?? undefined,
        username: "",
        privateKey: "",
        connection: "ssh" as const,
      }
    }
    return {
      name: r.deviceName,
      address: cidrToAddress(r.ipAddress),
      port: r.portSSH ?? undefined,
      username: r.username,
      privateKey: decryptSecret(r.privateKey),
      connection: "ssh" as const,
    }
  })

  if (credentialless.length > 0) {
    throw new ResolveRunCredentiallessError(
      `Device(s) without a credential cannot be run against: ${credentialless.join(", ")}`
    )
  }

  return hosts
}

export class ResolveRunNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResolveRunNotFoundError"
  }
}

export class ResolveRunValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResolveRunValidationError"
  }
}

export class ResolveRunCredentiallessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResolveRunCredentiallessError"
  }
}
