import { getIcon } from "@/lib/icon-registry"

const ArrowLeft = getIcon("navigation", "back")
const Check = getIcon("controls", "check")
const Loader2 = getIcon("status", "loading")
const Computer = getIcon("resources", "device")
const Trash2 = getIcon("actions", "delete")

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useDeviceGroupAssign,
  useDeviceGroupsByGroup,
  useDeviceGroupUnassign,
} from "@/features/inventory/hooks/useDeviceGroups"
import { useDevicesList } from "@/features/inventory/hooks/useDevices"
import {
  useGroupDelete,
  useGroupGet,
  useGroupUpdate,
} from "@/features/inventory/hooks/useGroups"
import { useConfirm } from "@/hooks/useConfirm"
import { navigate } from "@/lib/navigate"
import { cn } from "@/lib/utils"

function GroupDetailPageInner({ id }: { id: string }) {
  const { t } = useTranslation("inventory")
  const { t: tCommon } = useTranslation("common")
  const { data: group, isPending, isError } = useGroupGet(id)
  const { data: allDevices = [] } = useDevicesList()
  const { data: groupRelations = [] } = useDeviceGroupsByGroup(id)

  const updateGroup = useGroupUpdate()
  const deleteGroup = useGroupDelete()
  const assign = useDeviceGroupAssign()
  const unassign = useDeviceGroupUnassign()
  const confirm = useConfirm()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description ?? "")
    }
  }, [group])

  const assignedIds = useMemo(
    () => new Set(groupRelations.map((r) => r.deviceId).filter(Boolean)),
    [groupRelations]
  )

  const isMutatingRelation = assign.isPending || unassign.isPending

  async function handleSave(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!group) return
    await updateGroup.mutateAsync({
      id: group.id,
      name,
      description: description || undefined,
    })
  }

  async function handleDelete() {
    if (!group) return
    const confirmed = await confirm({
      title: t("group.delete_confirm_title", { label: group.name }),
      description: t("group.delete_description"),
      confirmLabel: t("group.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    await deleteGroup.mutateAsync({ id: group.id })
    navigate("/inventory")
  }

  async function handleToggleDevice(deviceId: string) {
    if (!group) return
    const isAssigned = assignedIds.has(deviceId)
    if (isAssigned) {
      await unassign.mutateAsync({ groupId: group.id, deviceId })
    } else {
      await assign.mutateAsync({ groupId: group.id, deviceId })
    }
  }

  if (isPending) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("group.detail_loading")}
        </div>
      </main>
    )
  }

  if (isError || !group) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("group.detail_load_error")}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/inventory">
            <ArrowLeft className="size-4" />
            {t("group.back_to_inventory")}
          </a>
        </Button>
      </main>
    )
  }

  const pendingDeviceId = assign.isPending
    ? assign.variables?.deviceId
    : unassign.isPending
      ? unassign.variables?.deviceId
      : null

  return (
    <main className="w-full flex-1 p-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={t("group.back_aria")}
          >
            <a href="/inventory">
              <ArrowLeft className="size-4" />
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
            {group.description ? (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {group.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10">
        {/* ── Información ── */}
        <section>
          <h2 className="mb-4 type-label text-muted-foreground">
            {t("group.information")}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">
                  {t("group_form.name_label")}
                </Label>
                <Input
                  id="group-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder={t("group_form.name_placeholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">
                  {t("group_form.description_label")}
                </Label>
                <Input
                  id="group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder={t("group_form.description_placeholder")}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("group.common_saving")}
                  </>
                ) : (
                  {t("group.save_changes")}
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Dispositivos ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="type-label text-muted-foreground">
              {t("group.devices")}
            </h2>
            <span className="text-muted-foreground text-xs">
              {t("group.assigned_count", {
                assigned: assignedIds.size,
                total: allDevices.length,
              })}
            </span>
          </div>

          {allDevices.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">
                {t("group.no_devices_in_inventory")}
              </p>
            </div>
          ) : (
            <ul className="divide-y rounded-xl border">
              {allDevices.map((device) => {
                const isAssigned = assignedIds.has(device.id)
                const isRowPending = pendingDeviceId === device.id

                return (
                  <li key={device.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleDevice(device.id)}
                      disabled={isMutatingRelation && !isRowPending}
                      className="hover:bg-accent flex w-full items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl disabled:opacity-50"
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isAssigned
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input"
                        )}
                      >
                        {isRowPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : isAssigned ? (
                          <Check className="size-3" />
                        ) : null}
                      </span>
                      <Computer className="text-muted-foreground size-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-sm">
                          {device.name}
                        </span>
                        {device.description ? (
                          <span className="text-muted-foreground block truncate text-xs">
                            {device.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground font-mono text-xs shrink-0">
                        {device.ipAddress}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Zona de peligro ── */}
        <section>
          <h2 className="mb-4 type-label text-muted-foreground">
            {t("group.danger_zone")}
          </h2>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("group.delete_title")}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {t("group.delete_hint")}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteGroup.isPending}
              >
                <Trash2 className="size-4" />
                {deleteGroup.isPending
                  ? t("group.deleting")
                  : t("group.delete")}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export function GroupDetailPage({ id }: { id?: string }) {
  if (!id) {
    return (
      <AppProviders>
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            {t("group.not_found")}
          </p>
        </main>
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <GroupDetailPageInner id={id} />
    </AppProviders>
  )
}
