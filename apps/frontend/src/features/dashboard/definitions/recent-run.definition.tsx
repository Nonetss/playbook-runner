import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import {
  formatRunDurationMs,
  RUN_OUTCOME_TONE,
  RunHostSummary,
  runOutcome,
} from "@/features/jobs/components/run-widgets"
import type { JobRunFeedRow } from "@/features/jobs/types"
import { formatDateTime } from "@/lib/format"

export interface RecentRunContext {
  tJobs: TFunction<"jobs">
  language: string
}

export const recentRunDefinition: EntityListDefinition<
  JobRunFeedRow,
  RecentRunContext
> = {
  getKey: (run) => run.id,
  getPrimary: (run, { tJobs }) => run.jobName ?? tJobs("history.deleted_job"),
  getSecondary: (run, { language }) => (
    <Text variant="data" tone="muted">
      {formatDateTime(run.startedAt ?? run.createdAt, language)}
    </Text>
  ),
  getOpenHref: (run) =>
    run.jobId ? `/jobs/${run.jobId}?run=${run.id}` : "/jobs/history",
  getStatus: (run, { tJobs }) => {
    const outcome = runOutcome(run)
    return {
      tone: RUN_OUTCOME_TONE[outcome],
      pulse: outcome === "running",
      label: tJobs(`status.${outcome}`),
    }
  },
  metadata: [
    {
      key: "duration",
      label: ({ tJobs }) => tJobs("history.headers.duration"),
      value: (run) => (
        <Text variant="data">{formatRunDurationMs(run.durationMs)}</Text>
      ),
    },
    {
      key: "hosts",
      label: ({ tJobs }) => tJobs("history.headers.hosts"),
      value: (run) => (
        <RunHostSummary hostsOk={run.hostsOk} hostsFailed={run.hostsFailed} />
      ),
    },
  ],
}
