import { beforeEach, describe, expect, test } from "bun:test"
import { IDS, jobRow, playbookRow, stepArgs } from "@playbook-runner/db/testing"
import { grpcStatus } from "@playbook-runner/grpc"
import { RunBundleResponse } from "@playbook-runner/grpc/stubs"
import { fakeDb } from "#tests/fixtures/db"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import {
  controlledStream,
  grpc,
  grpcError,
  resetGrpc,
  streamOf,
} from "#tests/fixtures/grpc"
import { encryptSecret } from "#v1/credentials/crypto"
import { executeJob, startJobRun } from "#v1/jobs/executor"
import { watchLiveRun } from "#v1/jobs/live"

const JOB = jobRow({ inventoryJson: [{ type: "device", id: IDS.device }] })
const COMMIT = "0123456789abcdef0123456789abcdef01234567"

const HOST_ROW = {
  deviceId: IDS.device,
  deviceName: "web-1",
  ipAddress: "10.0.0.10/32",
  portSSH: 22,
  credentialId: IDS.credential,
  username: "ansible",
  privateKey: encryptSecret("KEY"),
}

const TASK = RunBundleResponse.fromPartial({
  task: { event: "runner_on_ok", host: "web-1" },
})
const STATS = RunBundleResponse.fromPartial({
  task: {
    event: "playbook_on_stats",
    stats: {
      ok: { "web-1": 2, "web-2": 1 },
      changed: {},
      failures: { "web-2": 1 },
      dark: { "web-3": 1 },
      skipped: {},
    },
  },
})
const HEARTBEAT = RunBundleResponse.fromPartial({ heartbeat: {} })
const DONE_OK = RunBundleResponse.fromPartial({
  done: { status: "successful", rc: 0, ok: true },
})

let counter = 0
/** The live registry is process-wide: every run gets an id of its own. */
function freshRunId() {
  counter += 1
  return `00000000-0000-4000-8000-0000000002${String(counter).padStart(2, "0")}`
}

/** The playbook columns `resolveRun` selects. */
function playbookSelection(overrides: Parameters<typeof playbookRow>[0] = {}) {
  const { id, name, content, source, path, missing, repositoryId } =
    playbookRow(overrides)
  return { id, name, content, source, path, missing, repositoryId }
}

/** Queues `openRun` opening a run, then `resolveRun` resolving it. */
function queueOpenedRun(runId: string, job = JOB) {
  fakeDb.queue("execute", undefined)
  fakeDb.queue("select", [job], [])
  fakeDb.queue("insert", [{ id: runId }])
  fakeDb.queue("select", [playbookSelection()], [HOST_ROW])
}

/** The values the run's final update persisted. */
function persisted(): Record<string, unknown> {
  const update = fakeDb.calls("update").at(-1)
  if (!update) throw new Error("no update recorded")
  const [values] = stepArgs(update, "set")
  return typeof values === "object" && values !== null ? { ...values } : {}
}

beforeEach(() => {
  fakeDb.reset()
  resetEnv()
  resetGrpc()
})

describe("executeJob", () => {
  test("opens the run under the job's advisory lock inside a transaction", async () => {
    const runId = freshRunId()
    queueOpenedRun(runId)
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() => streamOf([DONE_OK]))

    expect(await executeJob(IDS.job, "schedule")).toBe(runId)

    const ops = fakeDb.calls().map((call) => call.op)
    expect(ops.slice(0, 5)).toEqual([
      "transaction",
      "execute",
      "select",
      "select",
      "insert",
    ])
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")[0]).toMatchObject({
      jobId: IDS.job,
      status: "running",
      trigger: "schedule",
    })
  })

  test("a job that is already running is skipped and nothing is written", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [JOB], [{ id: IDS.jobRun }])

    expect(await executeJob(IDS.job, "schedule")).toBeNull()
    expect(fakeDb.calls("insert")).toEqual([])
    expect(grpc.serverStream).not.toHaveBeenCalled()
  })

  test("a job that is gone is skipped", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [])

    expect(await executeJob(IDS.job)).toBeNull()
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("stores the events and the final status without heartbeats", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() =>
      streamOf([HEARTBEAT, TASK, HEARTBEAT, DONE_OK])
    )

    await executeJob(IDS.job)

    expect(persisted()).toMatchObject({
      status: "ok",
      eventsJson: [{ event: "runner_on_ok", host: "web-1" }],
      error: null,
      finishedAt: expect.any(Date),
    })
  })

  test("counts hosts from the recap: failed or unreachable hosts are failed", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() => streamOf([STATS, DONE_OK]))

    await executeJob(IDS.job)

    expect(persisted()).toMatchObject({ hostsOk: 1, hostsFailed: 2 })
  })

  test("without a recap the host counts stay unknown", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() => streamOf([TASK, DONE_OK]))

    await executeJob(IDS.job)

    expect(persisted()).toMatchObject({ hostsOk: null, hostsFailed: null })
  })

  test("a lost stream is stored as the run's error, keeping the events so far", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() =>
      streamOf([TASK], grpcError(grpcStatus.UNAVAILABLE, "reset"))
    )

    await executeJob(IDS.job)

    const values = persisted()
    expect(values).toMatchObject({
      status: "failed",
      eventsJson: [{ event: "runner_on_ok", host: "web-1" }],
    })
    expect(String(values.error)).toContain("pudo continuar")
  })

  test("a mid-run error frame fails the run with its message", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() =>
      streamOf([RunBundleResponse.fromPartial({ error: "boom" }), DONE_OK])
    )

    await executeJob(IDS.job)

    expect(persisted()).toMatchObject({ status: "failed", error: "boom" })
  })

  test("without a service token the run fails without calling the runner", async () => {
    testEnv.SERVICE_TOKEN = undefined
    queueOpenedRun(freshRunId())
    fakeDb.queue("update", undefined)

    await executeJob(IDS.job)

    expect(grpc.serverStream).not.toHaveBeenCalled()
    expect(persisted()).toMatchObject({ status: "failed" })
    expect(String(persisted().error)).toContain("SERVICE_TOKEN")
  })

  test("a job without a playbook fails without resolving anything", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [jobRow({ playbookId: null })], [])
    fakeDb.queue("insert", [{ id: freshRunId() }])
    fakeDb.queue("update", undefined)

    await executeJob(IDS.job)

    expect(fakeDb.calls("select")).toHaveLength(2)
    expect(persisted()).toMatchObject({ status: "failed" })
  })

  test("a Git playbook records the commit it ran at", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [JOB], [])
    fakeDb.queue("insert", [{ id: freshRunId() }])
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
          privateKey: null,
        },
      ],
      [HOST_ROW]
    )
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() => streamOf([DONE_OK]))

    await executeJob(IDS.job)

    expect(persisted()).toMatchObject({ status: "ok", commitSha: COMMIT })
  })

  test("a run whose result cannot be stored is still marked failed", async () => {
    queueOpenedRun(freshRunId())
    fakeDb.queueError("update", new Error("db down"))
    fakeDb.queue("update", undefined)
    grpc.serverStream.mockImplementation(() => streamOf([DONE_OK]))

    await executeJob(IDS.job)

    expect(fakeDb.calls("update")).toHaveLength(2)
    expect(persisted()).toMatchObject({ status: "failed" })
  })
})

describe("startJobRun", () => {
  test("returns the run id at once and finishes in the background", async () => {
    const runId = freshRunId()
    queueOpenedRun(runId)
    fakeDb.queue("update", undefined)
    const runner = controlledStream<RunBundleResponse>()
    grpc.serverStream.mockImplementation(() => runner.stream())

    expect(await startJobRun(IDS.job)).toEqual({ status: "opened", runId })
    expect(fakeDb.calls("update")).toEqual([])

    const watcher = watchLiveRun(runId)
    runner.push(TASK, HEARTBEAT, DONE_OK)
    runner.end()
    const seen: unknown[] = []
    for (;;) {
      const next = await watcher.next()
      if (next.done) {
        expect(next.value).toEqual({ runId, status: "ok", ok: true })
        break
      }
      seen.push(next.value)
    }

    expect(seen).toEqual([{ event: "runner_on_ok", host: "web-1" }])
    expect(persisted()).toMatchObject({ status: "ok" })
  })

  test("reports a conflict without opening a run", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [JOB], [{ id: IDS.jobRun }])

    expect(await startJobRun(IDS.job)).toEqual({ status: "conflict" })
    expect(fakeDb.calls("insert")).toEqual([])
  })

  test("reports a job that is gone", async () => {
    fakeDb.queue("execute", undefined)
    fakeDb.queue("select", [])

    expect(await startJobRun(IDS.job)).toEqual({ status: "not_found" })
  })
})
