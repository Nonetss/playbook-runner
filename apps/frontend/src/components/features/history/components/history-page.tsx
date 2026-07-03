import {
  ActivityIcon,
  HistoryIcon,
  Loader2,
  Timer,
  XCircle,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  formatRunDurationMs,
  formatRunTimestamp,
  RunStatusBadge,
  RunWindowPicker,
} from "@/components/features/jobs/components/run-widgets"
import {
  useJobRunMetrics,
  useJobRunsAll,
} from "@/components/features/jobs/hooks/useJobs"
import type {
  JobRunFeedRow,
  JobRunMetricsWindow,
} from "@/components/features/jobs/types"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"

/**
 * Build the URL for a run row. Clicking a run in the feed should drop the
 * user into the existing per-job detail page with the run preselected via
 * a `?run=` query string; the detail page reads that to focus its panel.
 * Runs whose parent job was deleted still link back to this page so the
 * row stays interactive without throwing on a missing job.
 */
function runHref(run: JobRunFeedRow): string {
  if (!run.jobId) return "/history"
  return `/jobs/${run.jobId}?run=${run.id}`
}

function FeedRow({ run }: { run: JobRunFeedRow }) {
  const { t } = useTranslation("jobs")
  return (
    <a
      href={runHref(run)}
      className="grid grid-cols-[1.4fr_1fr_0.8fr_0.6fr_1fr] items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/50"
    >
      <span className="truncate text-sm font-medium">
        {run.jobName ?? t("history.deleted_job")}
      </span>
      <RunStatusBadge status={run.status} />
      <span className="text-muted-foreground text-xs">
        {run.trigger === "schedule"
          ? t("history.trigger_schedule")
          : t("history.trigger_manual")}
      </span>
      <span className="font-mono text-xs">
        {formatRunDurationMs(run.durationMs)}
      </span>
      <span className="text-muted-foreground font-mono text-xs">
        {formatRunTimestamp(run.startedAt ?? run.createdAt)}
      </span>
    </a>
  )
}

function HistoryPageInner() {
  const { t } = useTranslation("jobs")
  const { t: tDashboard } = useTranslation("dashboard")
  const { t: tCommon } = useTranslation("common")

  const [window, setWindow] = useState<JobRunMetricsWindow>("24h")
  // `live: true` polls while the user is on the page so freshly-triggered
  // runs and metrics surface without a manual refresh.
  const { data: metrics } = useJobRunMetrics(window, { live: true })
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJobRunsAll({ live: true })

  const runs: JobRunFeedRow[] = data?.pages.flatMap((p) => p.runs) ?? []
  const totalLoaded = runs.length
  const successPct = metrics ? Math.round(metrics.successRate * 100) : null

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HistoryIcon className="size-6" />
            {t("history.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("history.page.subtitle")}
          </p>
        </div>
      </header>

      {/* Aggregate metrics + window selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t("history.metrics_title")}
          </h2>
          <RunWindowPicker value={window} onChange={setWindow} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={ActivityIcon}
            title={tDashboard("stats.success_rate")}
            value={
              successPct == null ? (metrics ? "0%" : "—") : `${successPct}%`
            }
            sub={metrics ? `${metrics.okCount}/${metrics.total}` : undefined}
            href="/history"
          />
          <StatCard
            icon={Timer}
            title={tDashboard("stats.runs_in_window")}
            value={metrics ? metrics.total : "—"}
            href="/history"
          />
          <StatCard
            icon={XCircle}
            title={tDashboard("stats.failures")}
            value={metrics ? metrics.failedCount : "—"}
            sub={
              metrics && metrics.total > 0
                ? `${Math.round((metrics.failedCount / metrics.total) * 100)}%`
                : undefined
            }
            href="/history"
          />
          <StatCard
            icon={Timer}
            title={tDashboard("stats.avg_duration")}
            value={metrics ? formatRunDurationMs(metrics.avgDurationMs) : "—"}
            href="/history"
          />
        </div>
      </section>

      {isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 py-12 justify-center text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("history.loading")}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
          {t("history.load_error")}
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => refetch()}
          >
            {tCommon("actions.retry")}
          </Button>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-4 py-16 text-center">
          <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card">
            <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.6fr_1fr] gap-3 border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{t("history.headers.job")}</span>
              <span>{t("history.headers.status")}</span>
              <span>{t("history.headers.trigger")}</span>
              <span>{t("history.headers.duration")}</span>
              <span>{t("history.headers.timestamp")}</span>
            </div>
            <div className="divide-y divide-border/50">
              {runs.map((run) => (
                <FeedRow key={run.id} run={run} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              {t("history.loaded_count", { count: totalLoaded })}
            </p>
            {hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("history.load_more")}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </main>
  )
}

export function HistoryPage() {
  return (
    <AppProviders>
      <HistoryPageInner />
    </AppProviders>
  )
}
