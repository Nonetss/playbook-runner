/**
 * A single inventory selection forwarded to a run endpoint or stored on a
 * job. `all` is the built-in All group (every device), so it has no id.
 */
export type RunSelection =
  | { id: string; type: "group" | "device" }
  | { type: "all" }

/** Per-event payload streamed by the backend's `run.*` oRPC procedures. */
export type RunEvent = {
  event: string
  host?: string
  play?: string
  task?: string
  task_action?: string
  changed?: boolean
  msg?: string
  stdout?: string
  stderr?: string
  rc?: number
  stats?: {
    ok: Record<string, number>
    changed: Record<string, number>
    failures: Record<string, number>
    dark: Record<string, number>
    skipped: Record<string, number>
  }
}

/** Terminal payload of a finished run. */
export type RunResult = {
  status: string
  rc: number
  ok: boolean
}

export type RunPhase = "idle" | "running" | "done" | "error" | "cancelled"

export type RunOptions = {
  forks?: number
  extravars?: Record<string, string>
}
