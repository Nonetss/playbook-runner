import { getIcon } from "@/lib/icon-registry"

const ActivityIcon = getIcon("views", "activity")
const Clock = getIcon("scheduling", "time")
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
} from "@/features/jobs"
import { useJobRunMetrics, useJobRunsAll } from "@/features/jobs/hooks/use-jobs"
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
  const jobName = run.jobName ?? t("history.deleted_job")
  const trigger =
    run.trigger === "schedule"
      ? t("history.trigger_schedule")
      : t("history.trigger_manual")
  const timestamp = formatRunTimestamp(run.startedAt ?? run.createdAt)

  return (
    <a
      href={runHref(run)}
      className="block rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/50 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] md:items-center md:gap-3 md:px-3 md:py-2.5"
    >
      <div className="flex items-start justify-between gap-3 md:contents">
        <span className="min-w-0 truncate text-sm font-medium">{jobName}</span>
        <RunStatusBadge
          status={run.status}
          hostsOk={run.hostsOk}
          hostsFailed={run.hostsFailed}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 md:contents">
        {/* Wrapper keeps the grid cell occupied when no recap is available. */}
        <span className="col-span-2 min-w-0 truncate md:col-span-1">
          <span className="mr-1.5 text-muted-foreground md:hidden">
            {t("history.headers.hosts")}:
          </span>
          <RunHostSummary hostsOk={run.hostsOk} hostsFailed={run.hostsFailed} />
        </span>
        <span className="text-muted-foreground text-xs">
          <span className="mr-1.5 md:hidden">
            {t("history.headers.trigger")}:
          </span>
          {trigger}
        </span>
        <span className="font-mono text-xs">
          <span className="mr-1.5 font-sans text-muted-foreground md:hidden">
            {t("history.headers.duration")}:
          </span>
          {formatRunDurationMs(run.durationMs)}
        </span>
        <span className="col-span-2 text-muted-foreground font-mono text-xs md:col-span-1">
          <span className="mr-1.5 font-sans md:hidden">
            {t("history.headers.timestamp")}:
          </span>
          {timestamp}
        </span>
      </div>
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
          <h2 className="text-muted-foreground type-label">
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
            icon={Clock}
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
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.9fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] gap-3 border-b px-3 py-2 type-label text-muted-foreground md:grid">
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
