import { getIcon } from "@/lib/icon-registry"

const History = getIcon("resources", "history")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import { Switch } from "@/components/ui/switch"
import { RunStatusTag } from "@/features/jobs/components/run-widgets"
import type { Job, JobRollup } from "@/features/jobs/types"
import { formatDateTime } from "@/lib/format"
import { navigate } from "@/lib/navigate"

export interface JobRowContext {
  t: TFunction<"jobs">
  tCommon: TFunction<"common">
  language: string
  playbookNames: Record<string, string>
  rollups: Record<string, JobRollup>
  deletingId: string | null
  togglingId: string | null
  onRun: (job: Job) => void
  onToggleEnabled: (job: Job, enabled: boolean) => void
  onDelete: (job: Job) => void
}

export const jobDefinition: EntityListDefinition<Job, JobRowContext> = {
  getKey: (job) => job.id,
  getPrimary: (job) => job.name,
  getSecondary: (job) => job.description,
  getOpenHref: (job) => `/jobs/${job.id}`,
  isMuted: (job, { deletingId }) => deletingId === job.id,
  getStatus: (job, { t }) =>
    job.enabled
      ? { tone: "primary", label: t("list.active") }
      : { tone: "border", label: t("list.paused") },
  metadata: [
    {
      key: "schedule",
      label: ({ t }) => t("list.schedule"),
      value: (job, { t }) =>
        job.cronExpression ? (
          <Text variant="data">{job.cronExpression}</Text>
        ) : (
          <span className="text-muted-foreground">{t("card.manual")}</span>
        ),
    },
    {
      key: "playbook",
      label: ({ t }) => t("list.playbook"),
      value: (job, { t, playbookNames }) => {
        const name = job.playbookId ? playbookNames[job.playbookId] : undefined
        return name ? (
          name
        ) : (
          <span className="text-muted-foreground">{t("card.no_playbook")}</span>
        )
      },
    },
    {
      key: "last-run",
      label: ({ t }) => t("list.last_run"),
      value: (job, { t, rollups, language }) => {
        const rollup = rollups[job.id]
        if (!rollup?.latestStatus) {
          return (
            <span className="text-muted-foreground">{t("list.never_run")}</span>
          )
        }
        return (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <RunStatusTag status={rollup.latestStatus} />
            <Text variant="data" tone="muted">
              {formatDateTime(rollup.latestCreatedAt, language)}
            </Text>
          </span>
        )
      },
    },
  ],
  renderTrailing: (job, { t, togglingId, deletingId, onToggleEnabled }) => (
    <Switch
      checked={job.enabled}
      disabled={togglingId === job.id || deletingId === job.id}
      onCheckedChange={(checked) => onToggleEnabled(job, checked)}
      aria-label={
        job.enabled ? t("card.disable_action") : t("card.enable_action")
      }
    />
  ),
  actions: [
    {
      key: "runs",
      label: (_, { t }) => t("card.view_runs"),
      icon: History,
      onSelect: (job) => navigate(`/jobs/${job.id}`),
    },
    {
      key: "run",
      label: (_, { tCommon }) => tCommon("actions.run_now"),
      icon: Play,
      disabled: (job) => !job.playbookId,
      onSelect: (job, { onRun }) => onRun(job),
    },
    {
      key: "edit",
      label: (_, { tCommon }) => tCommon("actions.edit"),
      icon: Pencil,
      onSelect: (job) => navigate(`/jobs/${job.id}/edit`),
    },
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (job, { deletingId }) => deletingId === job.id,
      onSelect: (job, { onDelete }) => onDelete(job),
    },
  ],
}
