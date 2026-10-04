import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import {
  inventoryDeviceGroups,
  inventoryDevices,
} from "@playbook-runner/db/schema/inventory"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { scripts } from "@playbook-runner/db/schema/scripts"
import { eq, inArray } from "drizzle-orm"
import { decryptSecret } from "#v1/credentials/crypto"
import { type RunInventorySelection, splitSelection } from "#v1/run/selection"

export type ResolvedRunHost = {
  name: string
  address: string
  port?: number
  username: string
  privateKey: string
  connection: "ssh"
}

export type ResolvedGitSource = {
  repository_id: string
  url: string
  commit: string
  path: string
  private_key?: string
}

export type ResolvedRunBundle = {
  playbook: { name: string; content: string; git?: ResolvedGitSource }
  hosts: ResolvedRunHost[]
  /** Commit a Git-sourced playbook runs at; undefined for inline playbooks. */
  commitSha?: string
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
      source: playbooks.source,
      path: playbooks.path,
      missing: playbooks.missing,
      repositoryId: playbooks.repositoryId,
    })
    .from(playbooks)
    .where(eq(playbooks.id, playbookId))
    .then((rows) => rows[0] ?? null)

  if (!playbook) {
    throw new ResolveRunNotFoundError(`Playbook ${playbookId} not found`)
  }

  const git =
    playbook.source === "git" ? await resolveGitSource(playbook) : undefined

  const hosts = await resolveHosts(inventory)

  return {
    playbook: { name: playbook.name, content: playbook.content, git },
    hosts,
    commitSha: git?.commit,
  }
}

/**
 * Pin a Git-sourced playbook to its repository's last synced commit, so the
 * run executes exactly what the UI shows. The deploy key (if any) is only
 * decrypted here, like host keys.
 */
async function resolveGitSource(playbook: {
  name: string
  path: string | null
  missing: boolean
  repositoryId: string | null
}): Promise<ResolvedGitSource> {
  if (playbook.missing) {
    throw new ResolveRunPreconditionError(
      `Playbook "${playbook.name}" no longer exists in its repository`
    )
  }
  const repository = playbook.repositoryId
    ? await db
        .select({
          id: playbookRepositories.id,
          url: playbookRepositories.url,
          lastCommitSha: playbookRepositories.lastCommitSha,
          privateKey: credentials.privateKey,
        })
        .from(playbookRepositories)
        .leftJoin(
          credentials,
          eq(credentials.id, playbookRepositories.credentialId)
        )
        .where(eq(playbookRepositories.id, playbook.repositoryId))
        .then((rows) => rows[0] ?? null)
    : null

  if (!repository || !playbook.path) {
    throw new ResolveRunNotFoundError(
      `Repository of playbook "${playbook.name}" not found`
    )
  }
  if (!repository.lastCommitSha) {
    throw new ResolveRunPreconditionError(
      `Repository of playbook "${playbook.name}" has not been synced`
    )
  }

  return {
    repository_id: repository.id,
    url: repository.url,
    commit: repository.lastCommitSha,
    path: playbook.path,
    private_key: repository.privateKey
      ? decryptSecret(repository.privateKey)
      : undefined,
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
 * credentials. Expands group entries to their member devices and an `all`
 * entry to every device, joins the device's credential, and fails fast on
 * missing credentials or unknown device ids. Used by `resolveRun`/
 * `resolveScript` and directly by ad-hoc command runs.
 */
export async function resolveHosts(
  inventory: RunInventorySelection[]
): Promise<ResolvedRunHost[]> {
  const {
    all,
    deviceIds: directDeviceIds,
    groupIds,
  } = splitSelection(inventory)

  let groupDeviceIds: string[] = []
  if (groupIds.length > 0) {
    const rows = await db
      .select({ deviceId: inventoryDeviceGroups.deviceId })
      .from(inventoryDeviceGroups)
      .where(inArray(inventoryDeviceGroups.groupId, groupIds))
    groupDeviceIds = rows.map((r) => r.deviceId)
  }

  // The built-in All group: every device in the inventory right now.
  let allDeviceIds: string[] = []
  if (all) {
    const rows = await db
      .select({ deviceId: inventoryDevices.id })
      .from(inventoryDevices)
    allDeviceIds = rows.map((r) => r.deviceId)
  }

  const deviceIds = Array.from(
    new Set([...directDeviceIds, ...groupDeviceIds, ...allDeviceIds])
  )
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

export class ResolveRunPreconditionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResolveRunPreconditionError"
  }
}
