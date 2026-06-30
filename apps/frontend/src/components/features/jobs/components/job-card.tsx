import {
  BriefcaseIcon,
  Clock,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from "lucide-react"
import type { Job } from "@/components/features/jobs/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

type JobCardProps = {
  job: Job
  playbookName?: string
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onRun: (job: Job) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  isDeleting?: boolean
  isTogglingEnabled?: boolean
}

export function JobCard({
  job,
  playbookName,
  onEdit,
  onDelete,
  onRun,
  onToggleEnabled,
  isDeleting = false,
  isTogglingEnabled = false,
}: JobCardProps) {
  const inventoryCount = job.inventoryJson?.length ?? 0

  return (
    <Card className="h-full gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <BriefcaseIcon className="size-4" />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Acciones para ${job.name}`}
                  disabled={isDeleting}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRun(job)} disabled={!job.playbookId}>
                  <Play className="size-4" />
                  Ejecutar ahora
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(job)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(job.id)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <p className="text-muted-foreground text-sm italic">Sin playbook asignado</p>
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
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={() => onRun(job)}
          disabled={isDeleting || !job.playbookId}
        >
          <Play className="size-4" />
          Ejecutar ahora
        </Button>
      </CardContent>
    </Card>
  )
}
