import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import type { ElementType } from "react"
import { useTranslation } from "react-i18next"
import type {
  JobRunMetricsWindow,
  JobRunStatus,
} from "@/components/features/jobs/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const RUN_STATUS_META: Record<
  JobRunStatus,
  { className: string; icon: ElementType }
> = {
  pending: {
    className: "border-zinc-300 text-muted-foreground",
    icon: Clock,
  },
  running: {
    className: "border-sky-500/40 bg-sky-500/10 text-sky-600",
    icon: Loader2,
  },
  ok: {
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    icon: CheckCircle2,
  },
  failed: {
    className: "border-red-500/40 bg-red-500/10 text-red-600",
    icon: XCircle,
  },
}

export function RunStatusBadge({ status }: { status: JobRunStatus }) {
  const { t } = useTranslation("jobs")
  const meta = RUN_STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1", meta.className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {t(`status.${status}`)}
    </Badge>
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
