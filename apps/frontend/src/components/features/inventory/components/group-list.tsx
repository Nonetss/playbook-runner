import { Folder, Plus } from "lucide-react"
import { GroupCard } from "@/components/features/inventory/components/group-card"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/components/features/inventory/types"
import { Button } from "@/components/ui/button"

type GroupListProps = {
  groups: InventoryGroup[]
  devicesByGroup: Map<string, InventoryDevice[]>
  onCreate?: () => void
  onEdit: (group: InventoryGroup) => void
  onDelete: (id: string) => void
  onManageDevices: (group: InventoryGroup) => void
  deletingId?: string | null
}

export function GroupList({
  groups,
  devicesByGroup,
  onCreate,
  onEdit,
  onDelete,
  onManageDevices,
  deletingId = null,
}: GroupListProps) {
  if (groups.length === 0 && onCreate) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <Folder className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">Sin grupos</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          Crea tu primer grupo para empezar a organizar dispositivos.
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          Nuevo grupo
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          devices={devicesByGroup.get(group.id) ?? []}
          onEdit={onEdit}
          onDelete={onDelete}
          onManageDevices={onManageDevices}
          isDeleting={deletingId === group.id}
        />
      ))}
    </div>
  )
}
