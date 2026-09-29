import { getIcon } from "@/lib/icon-registry"

const Link2 = getIcon("resources", "link")
const Pencil = getIcon("actions", "edit")
const Radio = getIcon("resources", "radio")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"

export interface DeviceRowContext {
  t: TFunction<"inventory">
  tCommon: TFunction<"common">
  groupsByDevice: Map<string, InventoryGroup[]>
  credentialsById: Map<string, { id: string; name: string }>
  deletingId: string | null
  onEdit: (device: InventoryDevice) => void
  onDelete: (device: InventoryDevice) => void
  onManageGroups: (device: InventoryDevice) => void
  onPing: (device: InventoryDevice) => void
}

function address(device: InventoryDevice) {
  return device.portSSH && device.portSSH !== 22
    ? `${device.ipAddress}:${device.portSSH}`
    : device.ipAddress
}

export const deviceDefinition: EntityListDefinition<
  InventoryDevice,
  DeviceRowContext
> = {
  getKey: (device) => device.id,
  getPrimary: (device) => device.name,
  getSecondary: (device) => device.description,
  onOpen: (device, { onEdit }) => onEdit(device),
  isMuted: (device, { deletingId }) => deletingId === device.id,
  metadata: [
    {
      key: "address",
      label: ({ t }) => t("device.address"),
      value: (device) => <Text variant="data">{address(device)}</Text>,
    },
    {
      key: "credential",
      label: ({ t }) => t("device_form.credential_label"),
      value: (device, { credentialsById }) => {
        const credential = device.credentialId
          ? credentialsById.get(device.credentialId)
          : null
        return credential ? (
          <span className="font-mono text-xs">{credential.name}</span>
        ) : (
          <Text tone="muted">—</Text>
        )
      },
    },
    {
      key: "groups",
      label: ({ t }) => t("device.groups"),
      value: (device, { groupsByDevice, t }) => {
        const groups = groupsByDevice.get(device.id) ?? []
        return groups.length > 0 ? (
          <span title={groups.map((group) => group.name).join(", ")}>
            {groups.map((group) => group.name).join(", ")}
          </span>
        ) : (
          <Text tone="muted">{t("device.no_groups")}</Text>
        )
      },
    },
  ],
  actions: [
    {
      key: "edit",
      label: (_, { tCommon }) => tCommon("actions.edit"),
      icon: Pencil,
      onSelect: (device, { onEdit }) => onEdit(device),
    },
    {
      key: "groups",
      label: (_, { tCommon }) => tCommon("actions.manage_groups"),
      icon: Link2,
      onSelect: (device, { onManageGroups }) => onManageGroups(device),
    },
    {
      key: "ping",
      label: (_, { tCommon }) => tCommon("actions.ping"),
      icon: Radio,
      onSelect: (device, { onPing }) => onPing(device),
    },
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (device, { deletingId }) => deletingId === device.id,
      onSelect: (device, { onDelete }) => onDelete(device),
    },
  ],
}
