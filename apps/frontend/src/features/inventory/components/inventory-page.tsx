import { getIcon } from "@/lib/icon-registry"

const Computer = getIcon("resources", "device")
const Plus = getIcon("actions", "add")

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { useCredentialsList } from "@/features/credentials/hooks/use-credentials"
import { ALL_GROUP_ID, makeAllGroup } from "@/features/inventory/all-group"
import { DeviceFormModal } from "@/features/inventory/components/device-form-modal"
import { GroupFormModal } from "@/features/inventory/components/group-form-modal"
import { PingDeviceModal } from "@/features/inventory/components/ping-device-modal"
import { RelationsDialog } from "@/features/inventory/components/relations-dialog"
import { deviceDefinition } from "@/features/inventory/definitions/device.definition"
import { groupDefinition } from "@/features/inventory/definitions/group.definition"
import { useDeviceGroupsList } from "@/features/inventory/hooks/use-device-groups"
import {
  useDeviceDelete,
  useDevicesList,
} from "@/features/inventory/hooks/use-devices"
import {
  useGroupDelete,
  useGroupsList,
} from "@/features/inventory/hooks/use-groups"
import type {
  InventoryDevice,
  InventoryDeviceGroup,
  InventoryGroup,
} from "@/features/inventory/types"
import { useConfirm } from "@/hooks/use-confirm"

type InventorySection = "groups" | "devices"

type RelationsTarget =
  | { kind: "deviceGroups"; entityId: string; entityName: string }
  | { kind: "groupDevices"; entityId: string; entityName: string }
  | null

function InventoryPageInner({ section }: { section: InventorySection }) {
  const { t } = useTranslation("inventory")
  const { t: tCommon } = useTranslation("common")

  const groupsQuery = useGroupsList()
  const devicesQuery = useDevicesList()
  const groups = groupsQuery.data ?? []
  const devices = devicesQuery.data ?? []
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

  const allGroup = useMemo(() => makeAllGroup(t("all_group.description")), [t])

  const { groupsByDevice, devicesByGroup } = useMemo(() => {
    const byDevice = new Map<string, InventoryGroup[]>()
    // The built-in All group always holds every device.
    const byGroup = new Map<string, InventoryDevice[]>([
      [ALL_GROUP_ID, [...devices]],
    ])
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
  }, [deviceGroups, groupsById, devicesById, devices])

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

  async function handleDeleteGroup(group: InventoryGroup) {
    const label = group.name || t("group.fallback_label")
    const confirmed = await confirm({
      title: t("group.delete_confirm_title", { label }),
      description: t("group.delete_confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return

    // The mutation hook shows the error toast.
    deleteGroup.mutate({ id: group.id })
  }

  async function handleDeleteDevice(device: InventoryDevice) {
    const label = device.name || t("device.fallback_label")
    const confirmed = await confirm({
      title: t("device.delete_confirm_title", { label }),
      description: t("device.delete_confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return

    // The mutation hook shows the error toast.
    deleteDevice.mutate({ id: device.id })
  }

  const isGroups = section === "groups"
  const createLabel = isGroups
    ? t("page.create.group")
    : t("page.create.device")
  const createButton = (
    <Button onClick={isGroups ? openCreateGroup : openCreateDevice}>
      <Plus className="size-4" />
      {createLabel}
    </Button>
  )
  const totalCount = (
    <HeroCount
      segments={[
        {
          // Groups always include the built-in All group.
          count: isGroups ? groups.length + 1 : devices.length,
          label: tCommon("labels.total"),
        },
      ]}
    />
  )

  return (
    <>
      {isGroups ? (
        <ResourceOverview
          surface="groups"
          heroMeta={totalCount}
          heroAction={createButton}
          query={groupsQuery}
        >
          {(items) => (
            <EntityCardGrid
              items={[allGroup, ...items]}
              definition={groupDefinition}
              context={{
                t,
                tCommon,
                devicesByGroup,
                deletingId: deleteGroup.isPending
                  ? (deleteGroup.variables?.id ?? null)
                  : null,
                onEdit: openEditGroup,
                onDelete: handleDeleteGroup,
                onManageDevices: openManageGroupDevices,
              }}
            />
          )}
        </ResourceOverview>
      ) : (
        <ResourceOverview
          surface="devices"
          heroMeta={totalCount}
          heroAction={createButton}
          query={devicesQuery}
          isEmpty={(items) => items.length === 0}
          empty={{
            icon: <Computer />,
            title: t("device.empty_title"),
            description: t("device.empty_description"),
            action: createButton,
          }}
        >
          {(items) => (
            <EntityCardGrid
              items={items}
              definition={deviceDefinition}
              context={{
                t,
                tCommon,
                groupsByDevice,
                credentialsById,
                deletingId: deleteDevice.isPending
                  ? (deleteDevice.variables?.id ?? null)
                  : null,
                onEdit: openEditDevice,
                onDelete: handleDeleteDevice,
                onManageGroups: openManageDeviceGroups,
                onPing: openPingDevice,
              }}
            />
          )}
        </ResourceOverview>
      )}

      <GroupFormModal
        open={groupModalOpen}
        onOpenChange={handleGroupModalOpenChange}
        group={editingGroup}
      />
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
    </>
  )
}

function InventorySectionPage({ section }: { section: InventorySection }) {
  return (
    <AppProviders>
      <InventoryPageInner section={section} />
    </AppProviders>
  )
}

export function InventoryDevicesPage() {
  return <InventorySectionPage section="devices" />
}

export function InventoryGroupsPage() {
  return <InventorySectionPage section="groups" />
}

/** @deprecated Use InventoryDevicesPage or InventoryGroupsPage instead. */
export function InventoryPage() {
  return <InventoryDevicesPage />
}
