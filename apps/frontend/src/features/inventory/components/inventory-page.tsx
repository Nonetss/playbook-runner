import { getIcon } from "@/lib/icon-registry"

const Computer = getIcon("resources", "device")
const Folder = getIcon("resources", "folder")

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useCredentialsList } from "@/features/credentials/hooks/useCredentials"
import { DeviceFormModal } from "@/features/inventory/components/device-form-modal"
import { DeviceList } from "@/features/inventory/components/device-list"
import { GroupFormModal } from "@/features/inventory/components/group-form-modal"
import { GroupList } from "@/features/inventory/components/group-list"
import { PingDeviceModal } from "@/features/inventory/components/ping-device-modal"
import { RelationsDialog } from "@/features/inventory/components/relations-dialog"
import { useDeviceGroupsList } from "@/features/inventory/hooks/useDeviceGroups"
import {
  useDeviceDelete,
  useDevicesList,
} from "@/features/inventory/hooks/useDevices"
import {
  useGroupDelete,
  useGroupsList,
} from "@/features/inventory/hooks/useGroups"
import type {
  InventoryDevice,
  InventoryDeviceGroup,
  InventoryGroup,
} from "@/features/inventory/types"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

type InventorySection = "groups" | "devices"

type RelationsTarget =
  | { kind: "deviceGroups"; entityId: string; entityName: string }
  | { kind: "groupDevices"; entityId: string; entityName: string }
  | null

function InventoryPageInner({ section }: { section: InventorySection }) {
  const { t } = useTranslation("inventory")
  const { t: tCommon } = useTranslation("common")

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
      title: t("group.delete_confirm_title", { label }),
      description: t("group.delete_confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return

    try {
      await deleteGroup.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("group.delete_error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleDeleteDevice(id: string) {
    const device = devices.find((item) => item.id === id)
    const label = device?.name ?? "este dispositivo"
    const confirmed = await confirm({
      title: t("device.delete_confirm_title", { label }),
      description: t("device.delete_confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return

    try {
      await deleteDevice.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("device.delete_error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title={t(`page.${section}_title`)}
      description={t(`page.${section}_subtitle`)}
      createLabel={
        section === "groups" ? t("page.create.group") : t("page.create.device")
      }
      onCreate={section === "groups" ? openCreateGroup : openCreateDevice}
    >
      {section === "groups" ? (
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
              title: t("group.empty_title"),
              description: t("group.empty_description"),
              ctaLabel: t("page.create.group"),
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
              title: t("device.empty_title"),
              description: t("device.empty_description"),
              ctaLabel: t("page.create.device"),
              onCta: openCreateDevice,
              icon: <Computer className="size-5" />,
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
