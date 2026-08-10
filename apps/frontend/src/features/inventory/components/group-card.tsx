import { getIcon } from "@/lib/icon-registry"

const Folder = getIcon("resources", "folder")
const Link2 = getIcon("resources", "link")
const Pencil = getIcon("actions", "edit")
const Settings2 = getIcon("actions", "settings2")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"

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
  const { t } = useTranslation("common")
  return (
    <ResourceCard
      icon={<Folder className="size-4" />}
      title={group.name}
      description={group.description}
      contentClassName="flex flex-1 flex-col gap-3"
      actions={
        <RowActionsMenu
          label={`Acciones para ${group.name}`}
          disabled={isDeleting}
        >
          <DropdownMenuItem onClick={() => onEdit(group)}>
            <Pencil className="size-4" />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onManageDevices(group)}>
            <Link2 className="size-4" />
            {t("actions.manage_devices")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(group.id)}
          >
            <Trash2 className="size-4" />
            {t("actions.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      }
    >
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
    </ResourceCard>
  )
}
