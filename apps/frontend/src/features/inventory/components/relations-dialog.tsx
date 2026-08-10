import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")
const Folder = getIcon("resources", "folder")
const Loader2 = getIcon("status", "loading")
const Computer = getIcon("resources", "device")

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useDeviceGroupAssign,
  useDeviceGroupsByDevice,
  useDeviceGroupsByGroup,
  useDeviceGroupUnassign,
} from "@/features/inventory/hooks/useDeviceGroups"
import { notifyError, notifySuccess } from "@/lib/toast"

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

  async function handleToggle(option: Option) {
    const isSelected = selectedIds.has(option.id)
    try {
      if (isSelected) {
        await unassign.mutateAsync(
          isDevice
            ? { deviceId: entityId, groupId: option.id }
            : { groupId: entityId, deviceId: option.id }
        )
        notifySuccess(t("relations.removed"))
      } else {
        await assign.mutateAsync(
          isDevice
            ? { deviceId: entityId, groupId: option.id }
            : { groupId: entityId, deviceId: option.id }
        )
        notifySuccess(t("relations.created"))
      }
    } catch (err) {
      notifyError(
        isSelected ? t("relations.remove_error") : t("relations.create_error"),
        err instanceof Error ? err.message : undefined
      )
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {relationsPending ? (
          <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="size-4 animate-spin" />
            {t("relations.loading")}
          </div>
        ) : relationsError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t("relations.load_error")}
          </div>
        ) : options.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm">
            <p className="text-muted-foreground">{empty}</p>
          </div>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedIds.has(option.id)
              const isRowPending = pendingId === option.id
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(option)}
                    disabled={isMutating && !isRowPending}
                    className="hover:bg-accent flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors disabled:opacity-60"
                  >
                    <span
                      className={
                        "flex size-4 shrink-0 items-center justify-center rounded-sm border " +
                        (isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input")
                      }
                    >
                      {isRowPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isSelected ? (
                        <Check className="size-3" />
                      ) : null}
                    </span>
                    <OptionIcon className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block truncate font-medium">
                        {option.name}
                      </span>
                      {option.description ? (
                        <span className="text-muted-foreground block truncate text-xs">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isMutating}
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
