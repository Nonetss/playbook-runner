import { getIcon } from "@/lib/icon-registry"

const HistoryIcon = getIcon("resources", "history")
const Loader2 = getIcon("status", "loading")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import {
  MetadataCell,
  MetadataList,
} from "@/components/shared/data-display/metadata-cell"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatRunDurationMs,
  RunHostSummary,
  RunStatusTag,
  RunWindowPicker,
} from "@/features/jobs"
import { useJobRunMetrics, useJobRunsAll } from "@/features/jobs/hooks/use-jobs"
import type { JobRunFeedRow, JobRunMetricsWindow } from "@/features/jobs/types"
import { formatDateTime } from "@/lib/format"
import { navigate } from "@/lib/navigate"

/**
 * Build the URL for a run row. Clicking a run in the feed drops the user
 * into the per-job detail page with the run preselected via `?run=`. Runs
 * whose parent job was deleted have no destination.
 */
function runHref(run: JobRunFeedRow): string | null {
  if (!run.jobId) return null
  return `/jobs/${run.jobId}?run=${run.id}`
}

function RunsTable({ runs }: { runs: JobRunFeedRow[] }) {
  const { t, i18n } = useTranslation("jobs")

  return (
    <div className="@container overflow-hidden rounded-xl border bg-card/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("history.headers.job")}</TableHead>
            <TableHead>{t("history.headers.status")}</TableHead>
            <TableHead className="hidden @xl:table-cell">
              {t("history.headers.hosts")}
            </TableHead>
            <TableHead className="hidden @3xl:table-cell">
              {t("history.headers.trigger")}
            </TableHead>
            <TableHead className="hidden @md:table-cell">
              {t("history.headers.duration")}
            </TableHead>
            <TableHead>{t("history.headers.timestamp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const href = runHref(run)
            const jobName = run.jobName ?? t("history.deleted_job")
            return (
              <TableRow
                key={run.id}
                className={href ? "cursor-pointer" : undefined}
                onClick={href ? () => navigate(href) : undefined}
              >
                <TableCell className="max-w-64 truncate">
                  {href ? (
                    <AppLink
                      href={href}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium outline-none focus-visible:underline"
                    >
                      {jobName}
                    </AppLink>
                  ) : (
                    <span className="text-muted-foreground">{jobName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <RunStatusTag
                    status={run.status}
                    hostsOk={run.hostsOk}
                    hostsFailed={run.hostsFailed}
                  />
                </TableCell>
                <TableCell className="hidden @xl:table-cell">
                  <RunHostSummary
                    hostsOk={run.hostsOk}
                    hostsFailed={run.hostsFailed}
                  />
                </TableCell>
                <TableCell className="hidden text-muted-foreground @3xl:table-cell">
                  {run.trigger === "schedule"
                    ? t("history.trigger_schedule")
                    : t("history.trigger_manual")}
                </TableCell>
                <TableCell className="hidden @md:table-cell">
                  <Text variant="data">
                    {formatRunDurationMs(run.durationMs)}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text variant="data" tone="muted">
                    {formatDateTime(
                      run.startedAt ?? run.createdAt,
                      i18n.language
                    )}
                  </Text>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function HistoryPageInner() {
  const { t } = useTranslation("jobs")
  const { t: tDashboard } = useTranslation("dashboard")

  const [window, setWindow] = useState<JobRunMetricsWindow>("24h")
  // `live: true` polls while the user is on the page so freshly-triggered
  // runs and metrics surface without a manual refresh.
  const { data: metrics } = useJobRunMetrics(window, { live: true })
  const feed = useJobRunsAll({ live: true })
  const runs: JobRunFeedRow[] = feed.data?.pages.flatMap((p) => p.runs) ?? []
  const successPct = metrics ? Math.round(metrics.successRate * 100) : null

  return (
    <ResourceOverview
      surface="history"
      heroMeta={
        <HeroCount
          segments={[
            {
              count: runs.length,
              label: t("history.loaded_label"),
            },
          ]}
        />
      }
      heroChildren={
        <section className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text as="h2" variant="label" tone="muted">
              {t("history.metrics_title")}
            </Text>
            <RunWindowPicker value={window} onChange={setWindow} />
          </div>
          <MetadataList columns={4}>
            <MetadataCell label={tDashboard("stats.success_rate")}>
              <span className="text-stat tabular-nums">
                {successPct == null ? "—" : `${successPct}%`}
              </span>
              {metrics ? (
                <Text variant="data" tone="muted" className="ml-2">
                  {metrics.okCount}/{metrics.total}
                </Text>
              ) : null}
            </MetadataCell>
            <MetadataCell label={tDashboard("stats.runs_in_window")}>
              <span className="text-stat tabular-nums">
                {metrics ? metrics.total : "—"}
              </span>
            </MetadataCell>
            <MetadataCell
              label={tDashboard("stats.failures")}
              tone={
                metrics && metrics.failedCount > 0 ? "destructive" : "default"
              }
            >
              <span className="text-stat tabular-nums">
                {metrics ? metrics.failedCount : "—"}
              </span>
            </MetadataCell>
            <MetadataCell label={tDashboard("stats.avg_duration")}>
              <span className="text-stat tabular-nums">
                {metrics ? formatRunDurationMs(metrics.avgDurationMs) : "—"}
              </span>
            </MetadataCell>
          </MetadataList>
        </section>
      }
      query={{
        data: runs,
        isPending: feed.isPending,
        isError: feed.isError,
        refetch: feed.refetch,
      }}
      loading={t("history.loading")}
      error={{ title: t("history.load_error") }}
      isEmpty={(items) => items.length === 0}
      empty={{ icon: <HistoryIcon />, title: t("history.empty") }}
      footer={
        runs.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <Text as="p" variant="meta" tone="muted" className="tabular-nums">
              {t("history.loaded_count", { count: runs.length })}
            </Text>
            {feed.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => feed.fetchNextPage()}
                disabled={feed.isFetchingNextPage}
              >
                {feed.isFetchingNextPage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("history.load_more")}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {(items) => <RunsTable runs={items} />}
    </ResourceOverview>
  )
}

export function HistoryPage() {
  return (
    <AppProviders>
      <HistoryPageInner />
    </AppProviders>
  )
}
