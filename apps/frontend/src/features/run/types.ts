/** A single inventory selection forwarded to a run endpoint. */
export type RunSelection = {
  id: string
  type: "group" | "device"
}

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

export type RunPhase = "idle" | "running" | "done" | "error"

export type RunOptions = {
  forks?: number
  extravars?: Record<string, string>
}
