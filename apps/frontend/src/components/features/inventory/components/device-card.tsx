import { MoreHorizontal, Pencil, Server, Trash2 } from "lucide-react"
import type { InventoryDevice } from "@/components/features/inventory/types"
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

type DeviceCardProps = {
  device: InventoryDevice
  onEdit: (device: InventoryDevice) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function DeviceCard({
  device,
  onEdit,
  onDelete,
  isDeleting = false,
}: DeviceCardProps) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <Server className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {device.name}
              </CardTitle>
              {device.description && (
                <CardDescription className="truncate">
                  {device.description}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${device.name}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(device)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(device.id)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {device.ipAddress}
          </Badge>
        </div>

        {device.description && (
          <p className="text-muted-foreground text-xs">
            {device.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
