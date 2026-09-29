import { useTranslation } from "react-i18next"
import {
  type StatusDotTone,
  StatusTag,
} from "@/components/shared/data-display/status-dot"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"
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
 * hosts did succeed that's a partial failure, not a total one.
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

/** Status language (DESIGN.md): dot tone per outcome, never a colour badge. */
export const RUN_OUTCOME_TONE: Record<RunOutcome, StatusDotTone> = {
  pending: "muted",
  running: "primary",
  ok: "foreground",
  partial: "destructive",
  failed: "destructive",
}

export function RunStatusTag({
  status,
  hostsOk,
  hostsFailed,
  className,
}: { status: JobRunStatus; className?: string } & RunHostCounts) {
  const { t } = useTranslation("jobs")
  const outcome = runOutcome({ status, hostsOk, hostsFailed })
  return (
    <StatusTag
      dotTone={RUN_OUTCOME_TONE[outcome]}
      pulse={outcome === "running"}
      className={cn(
        (outcome === "failed" || outcome === "partial") && "text-destructive",
        className
      )}
    >
      {t(`status.${outcome}`)}
    </StatusTag>
  )
}

/**
 * "1 failed · 4 ok" summary of a run's hosts. Renders nothing when the run
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
      className={cn("text-muted-foreground text-xs tabular-nums", className)}
      title={t("hosts.summary_title", { ok, failed, total: ok + failed })}
    >
      {failed > 0 ? (
        <>
          <span className="text-destructive">
            {t("hosts.failed", { count: failed })}
          </span>
          <span className="mx-1.5 text-border">·</span>
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
    <SegmentedPicker
      mono
      value={value}
      onChange={onChange}
      options={WINDOWS.map((w) => ({ value: w, label: t(`runs_window.${w}`) }))}
    />
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
