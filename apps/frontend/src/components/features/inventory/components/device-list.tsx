import { Plus, Server } from "lucide-react"
import { DeviceCard } from "@/components/features/inventory/components/device-card"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/components/features/inventory/types"
import { Button } from "@/components/ui/button"

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
  if (devices.length === 0 && onCreate) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <Server className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">Sin dispositivos</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          Añade tu primer dispositivo para empezar a gestionar el inventario.
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          Nuevo dispositivo
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
