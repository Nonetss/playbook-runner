import { getIcon } from "@/lib/icon-registry"

const Folder = getIcon("resources", "folder")
const Computer = getIcon("resources", "device")

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { StateCard } from "@/components/shared/feedback/state-card"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import { SelectableList } from "@/features/inventory/components/selectable-list"
import {
  useDeviceGroupAssign,
  useDeviceGroupsByDevice,
  useDeviceGroupsByGroup,
  useDeviceGroupUnassign,
} from "@/features/inventory/hooks/use-device-groups"

type Kind = "deviceGroups" | "groupDevices"

type Option = {
  id: string
  name: string
  description?: string | null
}

type RelationsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: Kind
  entityId: string
  entityName: string
  options: Option[]
}

export function RelationsDialog({
  open,
  onOpenChange,
  kind,
  entityId,
  entityName,
  options,
}: RelationsDialogProps) {
  const { t } = useTranslation("inventory")
  const { t: tCommon } = useTranslation("common")
  const isDevice = kind === "deviceGroups"

  const byDevice = useDeviceGroupsByDevice(entityId, {
    enabled: open && isDevice,
  })
  const byGroup = useDeviceGroupsByGroup(entityId, {
    enabled: open && !isDevice,
  })
  const relations = isDevice ? byDevice : byGroup
  const relationsPending = relations.isPending
  const relationsError = relations.isError

  const assign = useDeviceGroupAssign()
  const unassign = useDeviceGroupUnassign()

  const selectedIds = useMemo(() => {
    const list = relations.data ?? []
    return new Set(
      isDevice
        ? list.map((relation) => relation.groupId)
        : list.map((relation) => relation.deviceId)
    )
  }, [relations.data, isDevice])

  const pendingId = useMemo(() => {
    const pending = assign.isPending ? assign.variables : null
    if (pending) {
      return isDevice ? pending.groupId : pending.deviceId
    }
    const removing = unassign.isPending ? unassign.variables : null
    if (removing) {
      return isDevice ? removing.groupId : removing.deviceId
    }
    return null
  }, [
    assign.isPending,
    assign.variables,
    unassign.isPending,
    unassign.variables,
    isDevice,
  ])

  const isMutating = assign.isPending || unassign.isPending

  function handleToggle(option: Option) {
    const input = isDevice
      ? { deviceId: entityId, groupId: option.id }
      : { groupId: entityId, deviceId: option.id }
    // The hooks show the success/error toasts.
    if (selectedIds.has(option.id)) unassign.mutate(input)
    else assign.mutate(input)
  }

  const title = isDevice
    ? t("relations.device_groups_title")
    : t("relations.group_devices_title")
  const description = isDevice
    ? t("relations.device_groups_description", { name: entityName })
    : t("relations.group_devices_description", { name: entityName })
  const empty = isDevice ? t("relations.no_groups") : t("relations.no_devices")
  const OptionIcon = isDevice ? Folder : Computer

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      width="md"
      title={title}
      description={description}
      cancelLabel={tCommon("actions.close")}
      footer={
        <Button
          type="button"
          variant="outline"
          disabled={isMutating}
          onClick={() => onOpenChange(false)}
        >
          {tCommon("actions.close")}
        </Button>
      }
    >
      {relationsPending ? (
        <StateCard spinner title={t("relations.loading")} className="py-10" />
      ) : relationsError ? (
        <InlineAlert>{t("relations.load_error")}</InlineAlert>
      ) : options.length === 0 ? (
        <StateCard icon={<OptionIcon />} title={empty} className="py-10" />
      ) : (
        <SelectableList
          className="max-h-80 overflow-y-auto"
          items={options}
          selectedIds={selectedIds}
          pendingId={pendingId}
          disabled={isMutating}
          onToggle={handleToggle}
        />
      )}
    </FormDialog>
  )
}
