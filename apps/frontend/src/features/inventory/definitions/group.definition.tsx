import { getIcon } from "@/lib/icon-registry"

const Link2 = getIcon("resources", "link")
const Pencil = getIcon("actions", "edit")
const Settings2 = getIcon("actions", "settings2")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"
import { navigate } from "@/lib/navigate"

export interface GroupRowContext {
  t: TFunction<"inventory">
  tCommon: TFunction<"common">
  devicesByGroup: Map<string, InventoryDevice[]>
  deletingId: string | null
  onEdit: (group: InventoryGroup) => void
  onDelete: (group: InventoryGroup) => void
  onManageDevices: (group: InventoryGroup) => void
}

const PREVIEW_COUNT = 3

export const groupDefinition: EntityListDefinition<
  InventoryGroup,
  GroupRowContext
> = {
  getKey: (group) => group.id,
  getPrimary: (group) => group.name,
  getSecondary: (group) => group.description,
  getOpenHref: (group) => `/inventory/${group.id}/group`,
  isMuted: (group, { deletingId }) => deletingId === group.id,
  metadata: [
    {
      key: "count",
      label: ({ t }) => t("group.devices"),
      value: (group, { devicesByGroup }) => (
        <Text variant="data">{devicesByGroup.get(group.id)?.length ?? 0}</Text>
      ),
    },
    {
      key: "members",
      label: ({ t }) => t("group.members"),
      value: (group, { devicesByGroup, t }) => {
        const devices = devicesByGroup.get(group.id) ?? []
        if (devices.length === 0) {
          return <Text tone="muted">{t("group.no_devices")}</Text>
        }
        const names = devices.map((device) => device.name)
        const preview = names.slice(0, PREVIEW_COUNT).join(", ")
        const rest = names.length - PREVIEW_COUNT
        return (
          <span title={names.join(", ")}>
            {preview}
            {rest > 0 ? <Text tone="muted"> +{rest}</Text> : null}
          </span>
        )
      },
    },
  ],
  actions: [
    {
      key: "open",
      label: (_, { t }) => t("group.manage"),
      icon: Settings2,
      onSelect: (group) => navigate(`/inventory/${group.id}/group`),
    },
    {
      key: "edit",
      label: (_, { tCommon }) => tCommon("actions.edit"),
      icon: Pencil,
      onSelect: (group, { onEdit }) => onEdit(group),
    },
    {
      key: "devices",
      label: (_, { tCommon }) => tCommon("actions.manage_devices"),
      icon: Link2,
      onSelect: (group, { onManageDevices }) => onManageDevices(group),
    },
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (group, { deletingId }) => deletingId === group.id,
      onSelect: (group, { onDelete }) => onDelete(group),
    },
  ],
}
