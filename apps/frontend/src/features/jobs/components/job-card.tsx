import { getIcon } from "@/lib/icon-registry"

const BriefcaseIcon = getIcon("resources", "briefcase")
const Clock = getIcon("scheduling", "time")
const History = getIcon("resources", "history")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import type { Job } from "@/features/jobs/types"

type JobCardProps = {
  job: Job
  playbookName?: string
  onDelete: (id: string) => void
  onRun: (job: Job) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  isDeleting?: boolean
  isTogglingEnabled?: boolean
}

export function JobCard({
  job,
  playbookName,
  onDelete,
  onRun,
  onToggleEnabled,
  isDeleting = false,
  isTogglingEnabled = false,
}: JobCardProps) {
  const { t } = useTranslation("common")
  const { t: tJobs } = useTranslation("jobs")
  const inventoryCount = job.inventoryJson?.length ?? 0

  return (
    <ResourceCard
      icon={<BriefcaseIcon className="size-4" />}
      title={job.name}
      description={job.description}
      contentClassName="flex flex-1 flex-col gap-3"
      actions={
        <div className="flex shrink-0 items-center gap-1.5">
          <Switch
            checked={job.enabled}
            disabled={isTogglingEnabled || isDeleting}
            onCheckedChange={(checked) => onToggleEnabled(job.id, checked)}
            aria-label={
              job.enabled
                ? tJobs("card.disable_action")
                : tJobs("card.enable_action")
            }
          />
          <RowActionsMenu
            label={tJobs("card.actions_for", { name: job.name })}
            disabled={isDeleting}
          >
            <DropdownMenuItem asChild>
              <a href={`/jobs/${job.id}`}>
                <History className="size-4" />
                {tJobs("card.view_runs")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRun(job)}
              disabled={!job.playbookId}
            >
              <Play className="size-4" />
              {t("actions.run_now")}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/jobs/${job.id}/edit`}>
                <Pencil className="size-4" />
                {t("actions.edit")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(job.id)}
            >
              <Trash2 className="size-4" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </RowActionsMenu>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {job.cronExpression ? (
          <Badge variant="secondary" className="gap-1 font-mono text-xs">
            <Clock className="size-3" />
            {job.cronExpression}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {tJobs("card.manual")}
          </Badge>
        )}
        {!job.enabled && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {tJobs("card.disabled")}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {playbookName ? (
          <p className="text-sm">
            <span className="text-muted-foreground">
              {tJobs("card.playbook_prefix")}
            </span>
            <span className="font-medium">{playbookName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            {tJobs("card.no_playbook")}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {inventoryCount === 0
            ? tJobs("card.inventory_empty")
            : tJobs("card.inventory_count", { count: inventoryCount })}
        </p>
        {job.forks > 1 && (
          <p className="text-muted-foreground text-xs">
            {tJobs("card.forks", { count: job.forks })}
          </p>
        )}
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-auto w-full"
        disabled={isDeleting}
      >
        <a href={`/jobs/${job.id}`}>
          <History className="size-4" />
          {tJobs("card.view_runs")}
        </a>
      </Button>
    </ResourceCard>
  )
}
