import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const CheckCircle2 = getIcon("status", "success")
const Loader2 = getIcon("status", "loading")
const MinusCircle = getIcon("status", "minus")
const XCircle = getIcon("status", "error")

/** Per-host outcome reported by an Ansible run. */
export type RunHostStatus =
  | "running"
  | "ok"
  | "changed"
  | "failed"
  | "unreachable"
  | "skipped"

/**
 * The one status → terminal tone map shared by every run console, so the
 * same outcome always reads the same way (DESIGN.md, Run Console).
 */
export const RUN_HOST_STATUS: Record<
  RunHostStatus,
  { icon: typeof CheckCircle2; textClass: string }
> = {
  running: { icon: Loader2, textClass: "text-terminal-running" },
  ok: { icon: CheckCircle2, textClass: "text-terminal-ok" },
  changed: { icon: CheckCircle2, textClass: "text-terminal-changed" },
  failed: { icon: XCircle, textClass: "text-terminal-failed" },
  unreachable: { icon: AlertTriangle, textClass: "text-terminal-failed" },
  skipped: { icon: MinusCircle, textClass: "text-terminal-skipped" },
}

export function isFailedStatus(status: RunHostStatus) {
  return status === "failed" || status === "unreachable"
}
