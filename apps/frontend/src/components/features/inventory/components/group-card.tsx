import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { InventoryGroup } from "@/components/features/inventory/types"
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
  onEdit: (group: InventoryGroup) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function GroupCard({
  group,
  onEdit,
  onDelete,
  isDeleting = false,
}: GroupCardProps) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <Folder className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {group.name}
              </CardTitle>
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

      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs">
          Grupo de inventario
        </p>
      </CardContent>
    </Card>
  )
}
