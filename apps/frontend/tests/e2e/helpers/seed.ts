import type { APIRequestContext } from "@playwright/test"
import { rpc, rpcStatus } from "@test/e2e/helpers/rpc"

/** Unreachable on purpose (TEST-NET-1): runs against it never touch a host. */
export const UNREACHABLE_ADDRESS = "192.0.2.10"

type Created = { id: string }

/**
 * Creates records through the API for one test and deletes them, newest
 * first, when the test ends (the shared `seed` fixture calls `cleanup`), so
 * specs run in any order and repeatedly against the same database.
 */
export function createSeeder(request: APIRequestContext, prefix: string) {
  const cleanups: (() => Promise<unknown>)[] = []
  let counter = 0

  /** A unique, inventory-safe name (`[A-Za-z0-9._-]`) for this test. */
  function name(label: string) {
    counter += 1
    return `${prefix}-${counter}-${label}`
  }

  /** Calls `createPath`, then queues `deletePath` with the new id. */
  async function create<T extends Created>(
    createPath: string,
    json: unknown,
    deletePath: string
  ): Promise<T> {
    const record = await rpc<T>(request, createPath, json)
    track(deletePath, { id: record.id })
    return record
  }

  /** Queues a delete for a record created some other way (e.g. the UI). */
  function track(deletePath: string, json: unknown) {
    // A record the test deleted itself answers 404 here, which is fine.
    cleanups.push(() => rpcStatus(request, deletePath, json))
  }

  return {
    name,
    create,
    track,
    credential: (overrides: Record<string, unknown> = {}) =>
      rpc<{ privateKey: string; publicKey: string }>(
        request,
        "credentials/generate",
        { comment: "e2e" }
      ).then((pair) =>
        create<Created & { name: string }>(
          "credentials/create",
          { name: name("cred"), username: "ansible", ...pair, ...overrides },
          "credentials/delete"
        )
      ),
    device: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "inventory/devices/create",
        { name: name("dev"), ipAddress: UNREACHABLE_ADDRESS, ...overrides },
        "inventory/devices/delete"
      ),
    group: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "inventory/groups/create",
        { name: name("grp"), ...overrides },
        "inventory/groups/delete"
      ),
    assign: async (deviceId: string, groupId: string) => {
      await rpc(request, "inventory/deviceGroups/assign", { deviceId, groupId })
      track("inventory/deviceGroups/unassign", { deviceId, groupId })
    },
    folder: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "playbooks/folders/create",
        { name: name("folder"), ...overrides },
        "playbooks/folders/delete"
      ),
    playbook: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "playbooks/create",
        {
          name: name("playbook.yml"),
          description: "",
          content: "- hosts: all\n  gather_facts: false\n  tasks: []\n",
          ...overrides,
        },
        "playbooks/delete"
      ),
    script: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "scripts/create",
        {
          name: name("script"),
          description: "",
          content: "uptime\n",
          language: "bash",
          ...overrides,
        },
        "scripts/delete"
      ),
    job: (overrides: Record<string, unknown> = {}) =>
      create<Created & { name: string }>(
        "jobs/create",
        {
          name: name("job"),
          inventoryJson: [],
          cronExpression: "0 0 1 1 *",
          enabled: false,
          ...overrides,
        },
        "jobs/delete"
      ),
    /** Deletes everything this test created, newest first. */
    async cleanup() {
      for (const cleanup of cleanups.reverse()) await cleanup()
      cleanups.length = 0
    },
  }
}

export type Seeder = ReturnType<typeof createSeeder>
