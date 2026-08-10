import { getIcon } from "@/lib/icon-registry"

const BriefcaseIcon = getIcon("resources", "briefcase")
const Clock = getIcon("scheduling", "time")
const History = getIcon("resources", "history")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  const inventoryCount = job.inventoryJson?.length ?? 0

  return (
    <Card className="group h-full gap-4 py-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-primary/10 transition-all duration-200 group-hover:bg-primary/15 group-hover:ring-primary/20">
              <BriefcaseIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{job.name}</CardTitle>
              {job.description && (
                <CardDescription className="truncate">
                  {job.description}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Switch
              checked={job.enabled}
              disabled={isTogglingEnabled || isDeleting}
              onCheckedChange={(checked) => onToggleEnabled(job.id, checked)}
              aria-label={job.enabled ? "Desactivar job" : "Activar job"}
            />
            <RowActionsMenu
              label={`Acciones para ${job.name}`}
              disabled={isDeleting}
            >
              <DropdownMenuItem asChild>
                <a href={`/jobs/${job.id}`}>
                  <History className="size-4" />
                  Ver ejecuciones
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
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          {job.cronExpression ? (
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <Clock className="size-3" />
              {job.cronExpression}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Manual
            </Badge>
          )}
          {!job.enabled && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Desactivado
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {playbookName ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Playbook: </span>
              <span className="font-medium">{playbookName}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Sin playbook asignado
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            {inventoryCount === 0
              ? "Sin selección de inventario"
              : `${inventoryCount} elemento${inventoryCount === 1 ? "" : "s"} en inventario`}
          </p>
          {job.forks > 1 && (
            <p className="text-muted-foreground text-xs">Forks: {job.forks}</p>
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
            Ver ejecuciones
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
