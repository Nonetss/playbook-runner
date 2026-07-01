import {
  Folder,
  Link2,
  MoreHorizontal,
  Pencil,
  Settings2,
  Trash2,
} from "lucide-react"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/components/features/inventory/types"
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

type GroupCardProps = {
  group: InventoryGroup
  devices: InventoryDevice[]
  onEdit: (group: InventoryGroup) => void
  onDelete: (id: string) => void
  onManageDevices: (group: InventoryGroup) => void
  isDeleting?: boolean
}

export function GroupCard({
  group,
  devices,
  onEdit,
  onDelete,
  onManageDevices,
  isDeleting = false,
}: GroupCardProps) {
  return (
    <Card className="h-full gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <Folder className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{group.name}</CardTitle>
              {group.description && (
                <CardDescription className="truncate">
                  {group.description}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${group.name}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(group)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageDevices(group)}>
                <Link2 className="size-4" />
                Gestionar dispositivos
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(group.id)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        {devices.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">
              {devices.length} dispositivo{devices.length === 1 ? "" : "s"}:
            </span>
            {devices.slice(0, 4).map((device) => (
              <Badge key={device.id} variant="outline" className="text-xs">
                {device.name}
              </Badge>
            ))}
            {devices.length > 4 ? (
              <span className="text-muted-foreground text-xs">
                +{devices.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Sin dispositivos asignados.
          </p>
        )}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          disabled={isDeleting}
        >
          <a href={`/inventory/${group.id}/group`}>
            <Settings2 className="size-4" />
            Gestionar
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
