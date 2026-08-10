import { getIcon } from "@/lib/icon-registry"

const KeyRound = getIcon("resources", "apiKey")
const Link2 = getIcon("resources", "link")
const Pencil = getIcon("actions", "edit")
const Radio = getIcon("resources", "radio")
const Server = getIcon("resources", "server")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"

type CredentialSummary = {
  id: string
  name: string
}

type DeviceCardProps = {
  device: InventoryDevice
  groups: InventoryGroup[]
  credential?: CredentialSummary | null
  onEdit: (device: InventoryDevice) => void
  onDelete: (id: string) => void
  onManageGroups: (device: InventoryDevice) => void
  onPing: (device: InventoryDevice) => void
  isDeleting?: boolean
}

export function DeviceCard({
  device,
  groups,
  credential = null,
  onEdit,
  onDelete,
  onManageGroups,
  onPing,
  isDeleting = false,
}: DeviceCardProps) {
  const { t } = useTranslation("common")
  return (
    <ResourceCard
      icon={<Server className="size-4" />}
      title={device.name}
      description={device.description}
      contentClassName="space-y-3"
      actions={
        <RowActionsMenu
          label={`Acciones para ${device.name}`}
          disabled={isDeleting}
        >
          <DropdownMenuItem onClick={() => onEdit(device)}>
            <Pencil className="size-4" />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onManageGroups(device)}>
            <Link2 className="size-4" />
            {t("actions.manage_groups")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPing(device)}>
            <Radio className="size-4" />
            {t("actions.ping")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(device.id)}
          >
            <Trash2 className="size-4" />
            {t("actions.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {device.ipAddress}
          {device.portSSH && device.portSSH !== 22 ? `:${device.portSSH}` : ""}
        </Badge>
        {credential ? (
          <Badge variant="outline" className="gap-1 text-xs">
            <KeyRound className="size-3" />
            {credential.name}
          </Badge>
        ) : null}
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Grupos:</span>
          {groups.map((group) => (
            <Badge key={group.id} variant="outline" className="text-xs">
              {group.name}
            </Badge>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onManageGroups(device)}
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          Asignar a un grupo
        </button>
      )}
    </ResourceCard>
  )
}
