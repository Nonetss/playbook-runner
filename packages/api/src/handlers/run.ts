import { db } from "@playbook-runner/db"
import { credentials } from "@playbook-runner/db/schema/credentials"
import {
  inventoryDeviceGroups,
  inventoryDevices,
} from "@playbook-runner/db/schema/inventory"
import { playbooks } from "@playbook-runner/db/schema/playbooks"
import { eq, inArray } from "drizzle-orm"

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

export const runHandler = {
  resolveRun: async (
    playbookId: string,
    inventory: RunInventorySelection[]
  ): Promise<ResolvedRunBundle> => {
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

    const deviceIds = Array.from(
      new Set([...directDeviceIds, ...groupDeviceIds])
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
        privateKey: r.privateKey,
        connection: "ssh" as const,
      }
    })

    if (credentialless.length > 0) {
      throw new ResolveRunCredentiallessError(
        `Device(s) without a credential cannot be run against: ${credentialless.join(", ")}`
      )
    }

    return {
      playbook: { name: playbook.name, content: playbook.content },
      hosts,
    }
  },

  /**
   * Resolve a single device's connection details for diagnostic-style runs
   * (ping, ad-hoc tasks) that don't go through a stored playbook. Returns
   * the same host shape as `resolveRun` but for exactly one device.
   */
  resolveDevice: async (
    deviceId: string
  ): Promise<ResolvedRunHost> => {
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
      privateKey: rows.privateKey,
      connection: "ssh" as const,
    }
  },
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
