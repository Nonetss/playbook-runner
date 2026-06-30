"use client"

import { Folder, Server } from "lucide-react"
import { useMemo, useState } from "react"
import { useCredentialsList } from "@/components/features/credentials/hooks/useCredentials"
import { DeviceFormModal } from "@/components/features/inventory/components/device-form-modal"
import { DeviceList } from "@/components/features/inventory/components/device-list"
import { GroupFormModal } from "@/components/features/inventory/components/group-form-modal"
import { GroupList } from "@/components/features/inventory/components/group-list"
import { PingDeviceModal } from "@/components/features/inventory/components/ping-device-modal"
import { RelationsDialog } from "@/components/features/inventory/components/relations-dialog"
import { useDeviceGroupsList } from "@/components/features/inventory/hooks/useDeviceGroups"
import {
  useDeviceDelete,
  useDevicesList,
} from "@/components/features/inventory/hooks/useDevices"
import {
  useGroupDelete,
  useGroupsList,
} from "@/components/features/inventory/hooks/useGroups"
import type {
  InventoryDevice,
  InventoryDeviceGroup,
  InventoryGroup,
} from "@/components/features/inventory/types"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Tab = "groups" | "devices"

type RelationsTarget =
  | { kind: "deviceGroups"; entityId: string; entityName: string }
  | { kind: "groupDevices"; entityId: string; entityName: string }
  | null

function InventoryPageInner() {
  const [tab, setTab] = useState<Tab>("groups")

  const {
    data: groups = [],
    isPending: groupsPending,
    isError: groupsError,
    refetch: refetchGroups,
  } = useGroupsList()
  const {
    data: devices = [],
    isPending: devicesPending,
    isError: devicesError,
    refetch: refetchDevices,
  } = useDevicesList()
  const { data: deviceGroups = [] } = useDeviceGroupsList()
  const { data: credentials = [] } = useCredentialsList()
  const deleteGroup = useGroupDelete()
  const deleteDevice = useDeviceDelete()

  const confirm = useConfirm()

  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<InventoryGroup | null>(null)

  const [deviceModalOpen, setDeviceModalOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<InventoryDevice | null>(
    null
  )
  const [pingDevice, setPingDevice] = useState<InventoryDevice | null>(null)

  const [relationsTarget, setRelationsTarget] = useState<RelationsTarget>(null)

  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups]
  )
  const devicesById = useMemo(
    () => new Map(devices.map((device) => [device.id, device])),
    [devices]
  )
  const credentialsById = useMemo(
    () =>
      new Map(
        credentials.map((credential) => [
          credential.id,
          { id: credential.id, name: credential.name },
        ])
      ),
    [credentials]
  )

  const { groupsByDevice, devicesByGroup } = useMemo(() => {
    const byDevice = new Map<string, InventoryGroup[]>()
    const byGroup = new Map<string, InventoryDevice[]>()
    const relations = deviceGroups as InventoryDeviceGroup[]

    for (const relation of relations) {
      if (!relation.groupId || !relation.deviceId) continue
      const group = groupsById.get(relation.groupId)
      const device = devicesById.get(relation.deviceId)
      if (group && device) {
        const groupList = byDevice.get(relation.deviceId) ?? []
        groupList.push(group)
        byDevice.set(relation.deviceId, groupList)

        const deviceList = byGroup.get(relation.groupId) ?? []
        deviceList.push(device)
        byGroup.set(relation.groupId, deviceList)
      }
    }
    return { groupsByDevice: byDevice, devicesByGroup: byGroup }
  }, [deviceGroups, groupsById, devicesById])

  function openCreateGroup() {
    setEditingGroup(null)
    setGroupModalOpen(true)
  }
  function openEditGroup(group: InventoryGroup) {
    setEditingGroup(group)
    setGroupModalOpen(true)
  }
  function handleGroupModalOpenChange(open: boolean) {
    setGroupModalOpen(open)
    if (!open) setEditingGroup(null)
  }

  function openCreateDevice() {
    setEditingDevice(null)
    setDeviceModalOpen(true)
  }
  function openEditDevice(device: InventoryDevice) {
    setEditingDevice(device)
    setDeviceModalOpen(true)
  }
  function handleDeviceModalOpenChange(open: boolean) {
    setDeviceModalOpen(open)
    if (!open) setEditingDevice(null)
  }

  function openPingDevice(device: InventoryDevice) {
    setPingDevice(device)
  }

  function openManageDeviceGroups(device: InventoryDevice) {
    setRelationsTarget({
      kind: "deviceGroups",
      entityId: device.id,
      entityName: device.name,
    })
  }
  function openManageGroupDevices(group: InventoryGroup) {
    setRelationsTarget({
      kind: "groupDevices",
      entityId: group.id,
      entityName: group.name,
    })
  }
  function handleRelationsOpenChange(open: boolean) {
    if (!open) setRelationsTarget(null)
  }

  async function handleDeleteGroup(id: string) {
    const group = groups.find((item) => item.id === id)
    const label = group?.name ?? "este grupo"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })
    if (!confirmed) return

    try {
      await deleteGroup.mutateAsync({ id })
    } catch (err) {
      notifyError(
        "No se pudo eliminar el grupo",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleDeleteDevice(id: string) {
    const device = devices.find((item) => item.id === id)
    const label = device?.name ?? "este dispositivo"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })
    if (!confirmed) return

    try {
      await deleteDevice.mutateAsync({ id })
    } catch (err) {
      notifyError(
        "No se pudo eliminar el dispositivo",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title="Inventario"
      description="Gestiona los grupos y dispositivos de tu inventario Ansible."
      createLabel={tab === "groups" ? "Nuevo grupo" : "Nuevo dispositivo"}
      onCreate={tab === "groups" ? openCreateGroup : openCreateDevice}
    >
      <div className="mb-6 inline-flex rounded-md border bg-card p-1">
        <button
          type="button"
          onClick={() => setTab("groups")}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "groups"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Folder className="size-4" />
          Grupos
        </button>
        <button
          type="button"
          onClick={() => setTab("devices")}
          className={cn(
            "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "devices"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Server className="size-4" />
          Dispositivos
        </button>
      </div>

      {tab === "groups" ? (
        <>
          <GroupFormModal
            open={groupModalOpen}
            onOpenChange={handleGroupModalOpenChange}
            group={editingGroup}
          />
          <ResourceListState
            isPending={groupsPending}
            isError={groupsError}
            onRetry={() => refetchGroups()}
            items={groups}
            empty={{
              title: "Sin grupos",
              description:
                "Crea tu primer grupo para empezar a organizar dispositivos.",
              ctaLabel: "Nuevo grupo",
              onCta: openCreateGroup,
              icon: <Folder className="size-5" />,
            }}
          >
            {(items) => (
              <GroupList
                groups={items}
                devicesByGroup={devicesByGroup}
                onEdit={openEditGroup}
                onDelete={handleDeleteGroup}
                onManageDevices={openManageGroupDevices}
                deletingId={
                  deleteGroup.isPending
                    ? (deleteGroup.variables?.id ?? null)
                    : null
                }
              />
            )}
          </ResourceListState>
        </>
      ) : (
        <>
          <DeviceFormModal
            open={deviceModalOpen}
            onOpenChange={handleDeviceModalOpenChange}
            device={editingDevice}
          />
          <PingDeviceModal
            open={!!pingDevice}
            onOpenChange={(open) => {
              if (!open) setPingDevice(null)
            }}
            device={pingDevice}
          />
          <ResourceListState
            isPending={devicesPending}
            isError={devicesError}
            onRetry={() => refetchDevices()}
            items={devices}
            empty={{
              title: "Sin dispositivos",
              description:
                "Añade tu primer dispositivo para empezar a gestionar el inventario.",
              ctaLabel: "Nuevo dispositivo",
              onCta: openCreateDevice,
              icon: <Server className="size-5" />,
            }}
          >
            {(items) => (
              <DeviceList
                devices={items}
                groupsByDevice={groupsByDevice}
                credentialsById={credentialsById}
                onEdit={openEditDevice}
                onDelete={handleDeleteDevice}
                onManageGroups={openManageDeviceGroups}
                onPing={openPingDevice}
                deletingId={
                  deleteDevice.isPending
                    ? (deleteDevice.variables?.id ?? null)
                    : null
                }
              />
            )}
          </ResourceListState>
        </>
      )}

      {relationsTarget ? (
        <RelationsDialog
          open={!!relationsTarget}
          onOpenChange={handleRelationsOpenChange}
          kind={relationsTarget.kind}
          entityId={relationsTarget.entityId}
          entityName={relationsTarget.entityName}
          options={
            relationsTarget.kind === "deviceGroups"
              ? groups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  description: group.description,
                }))
              : devices.map((device) => ({
                  id: device.id,
                  name: device.name,
                  description: device.description,
                }))
          }
        />
      ) : null}
    </ResourcePage>
  )
}

export function InventoryPage() {
  return (
    <AppProviders>
      <InventoryPageInner />
    </AppProviders>
  )
}
