import { getIcon } from "@/lib/icon-registry"

const ActivityIcon = getIcon("views", "activity")
const HistoryIcon = getIcon("resources", "history")
const Loader2 = getIcon("status", "loading")
const Timer = getIcon("scheduling", "timer")
const XCircle = getIcon("status", "error")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import { StateCard } from "@/components/shared/data-display/state-card"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import {
  formatRunDurationMs,
  formatRunTimestamp,
  RunHostSummary,
  RunStatusBadge,
  RunWindowPicker,
} from "@/features/jobs/components/run-widgets"
import { useJobRunMetrics, useJobRunsAll } from "@/features/jobs/hooks/useJobs"
import type { JobRunFeedRow, JobRunMetricsWindow } from "@/features/jobs/types"

/**
 * Build the URL for a run row. Clicking a run in the feed should drop the
 * user into the existing per-job detail page with the run preselected via
 * a `?run=` query string; the detail page reads that to focus its panel.
 * Runs whose parent job was deleted still link back to this page so the
 * row stays interactive without throwing on a missing job.
 */
function runHref(run: JobRunFeedRow): string {
  if (!run.jobId) return "/jobs/history"
  return `/jobs/${run.jobId}?run=${run.id}`
}

function FeedRow({ run }: { run: JobRunFeedRow }) {
  const { t } = useTranslation("jobs")
  return (
    <a
      href={runHref(run)}
      className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.7fr_0.6fr_1fr] items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/50"
    >
      <span className="truncate text-sm font-medium">
        {run.jobName ?? t("history.deleted_job")}
      </span>
      <RunStatusBadge
        status={run.status}
        hostsOk={run.hostsOk}
        hostsFailed={run.hostsFailed}
      />
      {/* Wrapper keeps the grid cell occupied even when the run carries no
          recap and the summary renders nothing. */}
      <span className="truncate">
        <RunHostSummary hostsOk={run.hostsOk} hostsFailed={run.hostsFailed} />
      </span>
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
    <PageShell maxWidth="5xl" className="space-y-8">
      <PageHero
        icon={<HistoryIcon className="size-5" />}
        title={t("history.page.title")}
        description={t("history.page.subtitle")}
      />

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
            href="/jobs/history"
          />
          <StatCard
            icon={Timer}
            title={tDashboard("stats.runs_in_window")}
            value={metrics ? metrics.total : "—"}
            href="/jobs/history"
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
            href="/jobs/history"
          />
          <StatCard
            icon={Timer}
            title={tDashboard("stats.avg_duration")}
            value={metrics ? formatRunDurationMs(metrics.avgDurationMs) : "—"}
            href="/jobs/history"
          />
        </div>
      </section>

      {isPending ? (
        <StateCard spinner title={t("history.loading")} />
      ) : isError ? (
        <StateCard
          title={t("history.load_error")}
          tone="destructive"
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {tCommon("actions.retry")}
            </Button>
          }
        />
      ) : runs.length === 0 ? (
        <StateCard title={t("history.empty")} />
      ) : (
        <>
          <SoftCardList className="bg-card">
            <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.7fr_0.6fr_1fr] gap-3 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{t("history.headers.job")}</span>
              <span>{t("history.headers.status")}</span>
              <span>{t("history.headers.hosts")}</span>
              <span>{t("history.headers.trigger")}</span>
              <span>{t("history.headers.duration")}</span>
              <span>{t("history.headers.timestamp")}</span>
            </div>
            {runs.map((run) => (
              <FeedRow key={run.id} run={run} />
            ))}
          </SoftCardList>

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
    </PageShell>
  )
}

export function HistoryPage() {
  return (
    <AppProviders>
      <HistoryPageInner />
    </AppProviders>
  )
}
