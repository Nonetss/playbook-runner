import { grpcStatus, grpcStatusName, isGrpcError } from "@playbook-runner/grpc"
import type {
  Done,
  Host,
  RunBundleResponse,
  RunCommandResponse,
  RunPingResponse,
  RunScriptResponse,
  TaskEvent,
} from "@playbook-runner/grpc/stubs"
import type { ResolvedRunHost } from "#v1/run/resolve"

/**
 * ansible-runner playbooks/commands/scripts can run far longer than a
 * typical RPC — this only bounds runaway/hung executions, not normal ones.
 */
export const RUN_TIMEOUT_MS = 60 * 60 * 1000

/** gRPC statuses that mean the stream itself broke, not that the run failed. */
const STREAM_LOST_STATUSES: ReadonlySet<number> = new Set([
  grpcStatus.INTERNAL,
  grpcStatus.UNAVAILABLE,
  grpcStatus.CANCELLED,
])

/** True when a run stream died in transport (reset, proxy, connection loss). */
export function isStreamLost(err: unknown): boolean {
  return isGrpcError(err) && STREAM_LOST_STATUSES.has(err.code)
}

/**
 * Error text for a run stream that failed. A lost stream says so explicitly:
 * the hosts may have kept going, so a bare `gRPC INTERNAL` would mislead.
 */
export function describeStreamError(err: unknown): string {
  if (!isGrpcError(err)) {
    return err instanceof Error ? err.message : "Error en la ejecución"
  }
  const detail = `gRPC ${grpcStatusName(err)}: ${err.details}`
  if (!isStreamLost(err)) return detail
  return `Se perdió la conexión con el servicio de Ansible (${detail}); la ejecución pudo continuar o terminar en los hosts`
}

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
    // Transport-only keepalive from the runner during silent tasks.
    if (evt.heartbeat) continue
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
