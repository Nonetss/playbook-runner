import type {
  Done,
  Host,
  RunBundleResponse,
  RunCommandResponse,
  RunPingResponse,
  RunScriptResponse,
  TaskEvent,
} from "@playbook-runner/grpc/stubs"
import type { ResolvedRunHost } from "#v1/run/handler"

/**
 * ansible-runner playbooks/commands/scripts can run far longer than a
 * typical RPC — this only bounds runaway/hung executions, not normal ones.
 */
export const RUN_TIMEOUT_MS = 60 * 60 * 1000

/** A single ansible-runner event, reshaped from a `TaskEvent` gRPC frame. */
export type RunEventRecord = Record<string, unknown> & { event: string }

type ProtoRunResponse =
  | RunBundleResponse
  | RunPingResponse
  | RunCommandResponse
  | RunScriptResponse

export function toProtoHost(host: ResolvedRunHost): Host {
  return {
    name: host.name,
    address: host.address,
    port: host.port,
    username: host.username,
    private_key: host.privateKey,
    connection: host.connection,
  }
}

/** Reshapes a `TaskEvent` gRPC frame back into the flat event dict the UI/DB expect. */
export function taskEventToRecord(task: TaskEvent): RunEventRecord {
  const record: RunEventRecord = { event: task.event }
  if (task.host !== undefined) record.host = task.host
  if (task.play !== undefined) record.play = task.play
  if (task.task !== undefined) record.task = task.task
  if (task.task_action !== undefined) record.task_action = task.task_action
  if (task.changed !== undefined) record.changed = task.changed
  if (task.msg !== undefined) record.msg = task.msg
  if (task.stdout !== undefined) record.stdout = task.stdout
  if (task.stderr !== undefined) record.stderr = task.stderr
  if (task.rc !== undefined) record.rc = task.rc
  if (task.stats) record.stats = task.stats
  return record
}

/**
 * Adapts a `RunnerService` gRPC stream into a plain async generator: yields
 * one `RunEventRecord` per task event, `return`s the terminal `Done` payload,
 * and `throw`s when ansible reports a mid-run `error` frame. This is exactly
 * the shape an oRPC `eventIterator` handler needs — the oRPC RPC handler
 * takes care of transporting it to the browser, so callers never touch SSE
 * framing directly.
 */
export async function* toEventIterator(
  stream: AsyncIterable<ProtoRunResponse>
): AsyncGenerator<RunEventRecord, Done, void> {
  for await (const evt of stream) {
    if (evt.task) {
      yield taskEventToRecord(evt.task)
    } else if (evt.done) {
      return evt.done
    } else if (evt.error !== undefined) {
      throw new Error(evt.error)
    }
  }
  throw new Error("ansible closed the stream without a terminal frame")
}
