import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, playbookRow, scriptRow } from "@playbook-runner/db/testing"
import { fakeDb } from "#tests/fixtures/db"
import { encryptSecret } from "#v1/credentials/crypto"
import {
  ResolveRunCredentiallessError,
  ResolveRunNotFoundError,
  ResolveRunPreconditionError,
  ResolveRunValidationError,
  resolveDevice,
  resolveHosts,
  resolveRun,
  resolveScript,
} from "#v1/run/resolve"

const KEY = "-----BEGIN OPENSSH PRIVATE KEY-----\nhost\n"
const COMMIT = "0123456789abcdef0123456789abcdef01234567"
const OTHER_DEVICE = "00000000-0000-4000-8000-0000000000d2"

/** A device as the host query reads it: joined with its credential. */
function hostRow(
  overrides: Partial<{
    deviceId: string
    deviceName: string
    ipAddress: string
    portSSH: number | null
    credentialId: string | null
    username: string | null
    privateKey: string | null
  }> = {}
) {
  return {
    deviceId: IDS.device,
    deviceName: "web-1",
    ipAddress: "10.0.0.10/32",
    portSSH: 22,
    credentialId: IDS.credential,
    username: "ansible",
    privateKey: encryptSecret(KEY),
    ...overrides,
  }
}

/** The playbook columns `resolveRun` selects. */
function playbookSelection(overrides: Parameters<typeof playbookRow>[0] = {}) {
  const { id, name, content, source, path, missing, repositoryId } =
    playbookRow(overrides)
  return { id, name, content, source, path, missing, repositoryId }
}

/** What a rejected promise rejected with. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error
  )
}

const DEVICE = [{ type: "device" as const, id: IDS.device }]

beforeEach(() => fakeDb.reset())

describe("resolveHosts", () => {
  test("builds a host with the decrypted key and the address without its mask", async () => {
    fakeDb.queue("select", [hostRow()])

    expect(await resolveHosts(DEVICE)).toEqual([
      {
        name: "web-1",
        address: "10.0.0.10",
        port: 22,
        username: "ansible",
        privateKey: KEY,
        connection: "ssh",
      },
    ])
  })

  test("expands groups and de-duplicates devices reached twice", async () => {
    fakeDb.queue(
      "select",
      [{ deviceId: IDS.device }, { deviceId: OTHER_DEVICE }],
      [hostRow(), hostRow({ deviceId: OTHER_DEVICE, deviceName: "web-2" })]
    )

    const hosts = await resolveHosts([
      ...DEVICE,
      { type: "group", id: IDS.group },
    ])

    expect(hosts.map((host) => host.name)).toEqual(["web-1", "web-2"])
  })

  test("the All group reaches every device", async () => {
    fakeDb.queue(
      "select",
      [{ deviceId: IDS.device }, { deviceId: OTHER_DEVICE }],
      [hostRow(), hostRow({ deviceId: OTHER_DEVICE, deviceName: "web-2" })]
    )

    expect(await resolveHosts([{ type: "all" }])).toHaveLength(2)
  })

  test("a selection that reaches no device is a validation error", async () => {
    fakeDb.queue("select", [])

    expect(
      await rejection(resolveHosts([{ type: "group", id: IDS.group }]))
    ).toBeInstanceOf(ResolveRunValidationError)
  })

  test("an unknown device is a validation error naming it", async () => {
    fakeDb.queue("select", [])

    const error = await rejection(resolveHosts(DEVICE))

    expect(error).toBeInstanceOf(ResolveRunValidationError)
    expect(String(error)).toContain(IDS.device)
  })

  test("a device without a credential refuses the whole run", async () => {
    fakeDb.queue("select", [
      hostRow(),
      hostRow({
        deviceId: OTHER_DEVICE,
        deviceName: "bare",
        credentialId: null,
        username: null,
        privateKey: null,
      }),
    ])

    const error = await rejection(
      resolveHosts([...DEVICE, { type: "device", id: OTHER_DEVICE }])
    )

    expect(error).toBeInstanceOf(ResolveRunCredentiallessError)
    expect(String(error)).toContain("bare")
  })
})

describe("resolveDevice", () => {
  test("returns the device's host", async () => {
    fakeDb.queue("select", [hostRow({ portSSH: 2222 })])

    expect(await resolveDevice(IDS.device)).toMatchObject({
      name: "web-1",
      address: "10.0.0.10",
      port: 2222,
      privateKey: KEY,
    })
  })

  test("an unknown device is not found", async () => {
    fakeDb.queue("select", [])

    expect(await rejection(resolveDevice(IDS.device))).toBeInstanceOf(
      ResolveRunNotFoundError
    )
  })

  test("a device without a credential is refused", async () => {
    fakeDb.queue("select", [
      hostRow({ credentialId: null, username: null, privateKey: null }),
    ])

    expect(await rejection(resolveDevice(IDS.device))).toBeInstanceOf(
      ResolveRunCredentiallessError
    )
  })
})

describe("resolveScript", () => {
  test("bundles the script with its hosts", async () => {
    const { id, name, content, language } = scriptRow({ language: "python" })
    fakeDb.queue("select", [{ id, name, content, language }], [hostRow()])

    const bundle = await resolveScript(IDS.script, DEVICE)

    expect(bundle.script).toEqual({ name, content, language: "python" })
    expect(bundle.hosts).toHaveLength(1)
  })

  test("an unknown script is not found and no host is resolved", async () => {
    fakeDb.queue("select", [])

    expect(await rejection(resolveScript(IDS.script, DEVICE))).toBeInstanceOf(
      ResolveRunNotFoundError
    )
    expect(fakeDb.calls("select")).toHaveLength(1)
  })
})

describe("resolveRun", () => {
  test("an inline playbook runs its stored content", async () => {
    fakeDb.queue("select", [playbookSelection()], [hostRow()])

    const bundle = await resolveRun(IDS.playbook, DEVICE)

    expect(bundle.playbook).toEqual({
      name: "site.yml",
      content: "- hosts: all\n  tasks: []\n",
      git: undefined,
    })
    expect(bundle.commitSha).toBeUndefined()
  })

  test("an unknown playbook is not found", async () => {
    fakeDb.queue("select", [])

    expect(await rejection(resolveRun(IDS.playbook, DEVICE))).toBeInstanceOf(
      ResolveRunNotFoundError
    )
  })

  test("a Git playbook is pinned to the repository's last synced commit", async () => {
    fakeDb.queue(
      "select",
      [
        playbookSelection({
          source: "git",
          repositoryId: IDS.repository,
          path: "site.yml",
        }),
      ],
      [
        {
          id: IDS.repository,
          url: "https://git.example.com/infra.git",
          lastCommitSha: COMMIT,
          privateKey: encryptSecret(KEY),
        },
      ],
      [hostRow()]
    )

    const bundle = await resolveRun(IDS.playbook, DEVICE)

    expect(bundle.playbook.git).toEqual({
      repository_id: IDS.repository,
      url: "https://git.example.com/infra.git",
      commit: COMMIT,
      path: "site.yml",
      private_key: KEY,
    })
    expect(bundle.commitSha).toBe(COMMIT)
  })

  test("a Git playbook whose repository was never synced is a precondition failure", async () => {
    fakeDb.queue(
      "select",
      [
        playbookSelection({
          source: "git",
          repositoryId: IDS.repository,
          path: "site.yml",
        }),
      ],
      [
        {
          id: IDS.repository,
          url: "https://git.example.com/infra.git",
          lastCommitSha: null,
          privateKey: null,
        },
      ]
    )

    expect(await rejection(resolveRun(IDS.playbook, DEVICE))).toBeInstanceOf(
      ResolveRunPreconditionError
    )
  })

  test("a Git playbook gone from its repository is a precondition failure", async () => {
    fakeDb.queue("select", [
      playbookSelection({
        source: "git",
        repositoryId: IDS.repository,
        path: "site.yml",
        missing: true,
      }),
    ])

    expect(await rejection(resolveRun(IDS.playbook, DEVICE))).toBeInstanceOf(
      ResolveRunPreconditionError
    )
  })

  test("a Git playbook whose repository is gone is not found", async () => {
    fakeDb.queue(
      "select",
      [
        playbookSelection({
          source: "git",
          repositoryId: IDS.repository,
          path: "site.yml",
        }),
      ],
      []
    )

    expect(await rejection(resolveRun(IDS.playbook, DEVICE))).toBeInstanceOf(
      ResolveRunNotFoundError
    )
  })
})
