import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react"
import type { ElementType } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { JobRunMetricsWindow, JobRunStatus } from "@/features/jobs/types"
import { cn } from "@/lib/utils"

/**
 * Per-host recap counts attached to a finished run. Both null when Ansible
 * never reported a recap (run still in flight, or it died before the play).
 */
export type RunHostCounts = {
  hostsOk?: number | null
  hostsFailed?: number | null
}

/**
 * What the UI shows for a run. Adds `partial` on top of the stored statuses:
 * a run is stored as `failed` the moment a single host fails, but when other
 * hosts did succeed that's a partial failure, not a total one — worth amber
 * rather than red.
 */
export type RunOutcome = JobRunStatus | "partial"

export function runOutcome(
  run: { status: JobRunStatus } & RunHostCounts
): RunOutcome {
  if (run.status !== "failed") return run.status
  const ok = run.hostsOk ?? 0
  const failed = run.hostsFailed ?? 0
  return ok > 0 && failed > 0 ? "partial" : "failed"
}

export const RUN_STATUS_META: Record<
  RunOutcome,
  { className: string; icon: ElementType }
> = {
  pending: {
    className: "border-border/60 bg-muted/20 text-muted-foreground",
    icon: Clock,
  },
  running: {
    className: "border-primary/40 bg-primary/10 text-primary",
    icon: Loader2,
  },
  ok: {
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  partial: {
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    icon: AlertTriangle,
  },
  failed: {
    className: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: XCircle,
  },
}

export function RunStatusBadge({
  status,
  hostsOk,
  hostsFailed,
}: { status: JobRunStatus } & RunHostCounts) {
  const { t } = useTranslation("jobs")
  const outcome = runOutcome({ status, hostsOk, hostsFailed })
  const meta = RUN_STATUS_META[outcome]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1", meta.className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {t(`status.${outcome}`)}
    </Badge>
  )
}

/**
 * "4 ok · 1 failed" summary of a run's hosts. Renders nothing when the run
 * carries no recap, so in-flight rows stay clean.
 */
export function RunHostSummary({
  hostsOk,
  hostsFailed,
  className,
}: RunHostCounts & { className?: string }) {
  const { t } = useTranslation("jobs")
  const ok = hostsOk ?? 0
  const failed = hostsFailed ?? 0
  if (hostsOk == null && hostsFailed == null) return null
  if (ok + failed === 0) return null
  return (
    <span
      className={cn("text-muted-foreground text-xs", className)}
      title={t("hosts.summary_title", { ok, failed, total: ok + failed })}
    >
      {failed > 0 ? (
        <>
          <span className="text-red-600 dark:text-red-400">
            {t("hosts.failed", { count: failed })}
          </span>
          {" · "}
        </>
      ) : null}
      {t("hosts.ok", { count: ok })}
    </span>
  )
}

const WINDOWS: JobRunMetricsWindow[] = ["24h", "7d", "30d"]

export function RunWindowPicker({
  value,
  onChange,
}: {
  value: JobRunMetricsWindow
  onChange: (w: JobRunMetricsWindow) => void
}) {
  const { t } = useTranslation("dashboard")
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1 text-xs">
      {WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => onChange(w)}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-colors",
            value === w
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
          aria-pressed={value === w}
        >
          {t(`runs_window.${w}`)}
        </button>
      ))}
    </div>
  )
}

export function formatRunTimestamp(value: Date | string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRunDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—"
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}
