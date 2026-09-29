import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type { Job } from "@/features/jobs/types"

export interface DashboardJobContext {
  t: TFunction<"dashboard">
  playbookNames: Map<string, string>
}

export const dashboardJobDefinition: EntityListDefinition<
  Job,
  DashboardJobContext
> = {
  getKey: (job) => job.id,
  getPrimary: (job) => job.name,
  getSecondary: (job, { t, playbookNames }) =>
    (job.playbookId ? playbookNames.get(job.playbookId) : undefined) ??
    t("job_row.no_playbook"),
  getOpenHref: (job) => `/jobs/${job.id}`,
  getStatus: (job, { t }) =>
    job.enabled
      ? { tone: "primary", label: t("job_row.active") }
      : { tone: "border", label: t("job_row.inactive") },
  isMuted: (job) => !job.enabled,
  metadata: [
    {
      key: "schedule",
      label: ({ t }) => t("job_row.schedule"),
      value: (job, { t }) =>
        job.cronExpression ? (
          <Text variant="data">{job.cronExpression}</Text>
        ) : (
          <Text variant="meta" tone="muted">
            {t("job_row.manual")}
          </Text>
        ),
    },
  ],
}
