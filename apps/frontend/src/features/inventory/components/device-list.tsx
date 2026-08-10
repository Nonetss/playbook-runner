import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Computer = getIcon("resources", "device")

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DeviceCard } from "@/features/inventory/components/device-card"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"

type CredentialSummary = {
  id: string
  name: string
}

type DeviceListProps = {
  devices: InventoryDevice[]
  groupsByDevice: Map<string, InventoryGroup[]>
  credentialsById: Map<string, CredentialSummary>
  onCreate?: () => void
  onEdit: (device: InventoryDevice) => void
  onDelete: (id: string) => void
  onManageGroups: (device: InventoryDevice) => void
  onPing: (device: InventoryDevice) => void
  deletingId?: string | null
}

export function DeviceList({
  devices,
  groupsByDevice,
  credentialsById,
  onCreate,
  onEdit,
  onDelete,
  onManageGroups,
  onPing,
  deletingId = null,
}: DeviceListProps) {
  const { t } = useTranslation("inventory")
  if (devices.length === 0 && onCreate) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <Computer className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">{t("device.empty_title")}</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          {t("device.empty_description")}
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          {t("page.create.device")}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          groups={groupsByDevice.get(device.id) ?? []}
          credential={
            device.credentialId
              ? (credentialsById.get(device.credentialId) ?? null)
              : null
          }
          onEdit={onEdit}
          onDelete={onDelete}
          onManageGroups={onManageGroups}
          onPing={onPing}
          isDeleting={deletingId === device.id}
        />
      ))}
    </div>
  )
}
