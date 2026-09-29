import { getIcon } from "@/lib/icon-registry"

const Computer = getIcon("resources", "device")
const Loader2 = getIcon("status", "loading")
const Trash2 = getIcon("actions", "delete")

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { StateCard } from "@/components/shared/feedback/state-card"
import { FormField } from "@/components/shared/form/field-label"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SelectableList } from "@/features/inventory/components/selectable-list"
import {
  useDeviceGroupAssign,
  useDeviceGroupsByGroup,
  useDeviceGroupUnassign,
} from "@/features/inventory/hooks/use-device-groups"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import {
  useGroupDelete,
  useGroupGet,
  useGroupUpdate,
} from "@/features/inventory/hooks/use-groups"
import { useConfirm } from "@/hooks/use-confirm"
import { navigate } from "@/lib/navigate"

/** Label-role section heading with an optional right-aligned meta line. */
function Section({
  title,
  meta,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Text as="h2" variant="label" tone="muted">
          {title}
        </Text>
        {meta ? (
          <Text as="span" variant="meta" tone="muted" className="tabular-nums">
            {meta}
          </Text>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function GroupDetailFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation("inventory")
  return (
    <DetailFrame
      backHref="/inventory/groups"
      backLabel={t("group.back_to_groups")}
    >
      {children}
    </DetailFrame>
  )
}

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
    // The mutation hook shows the error toast.
    updateGroup.mutate({
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
    try {
      await deleteGroup.mutateAsync({ id: group.id })
    } catch {
      return // The mutation hook already showed the error toast.
    }
    navigate("/inventory/groups")
  }

  function handleToggleDevice(deviceId: string) {
    if (!group) return
    const input = { groupId: group.id, deviceId }
    if (assignedIds.has(deviceId)) unassign.mutate(input)
    else assign.mutate(input)
  }

  if (isPending) {
    return (
      <GroupDetailFrame>
        <StateCard spinner title={t("group.detail_loading")} />
      </GroupDetailFrame>
    )
  }

  if (isError || !group) {
    return (
      <GroupDetailFrame>
        <StateCard tone="destructive" title={t("group.detail_load_error")} />
      </GroupDetailFrame>
    )
  }

  const pendingDeviceId = assign.isPending
    ? (assign.variables?.deviceId ?? null)
    : unassign.isPending
      ? (unassign.variables?.deviceId ?? null)
      : null

  return (
    <GroupDetailFrame>
      <PageHero
        surface="groups"
        title={group.name}
        description={group.description || t("group.document_title")}
      />

      <div className="space-y-10">
        <Section title={t("group.information")}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("group_form.name_label")}
                htmlFor="group-name"
                required
              >
                <Input
                  id="group-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder={t("group_form.name_placeholder")}
                />
              </FormField>
              <FormField
                label={t("group_form.description_label")}
                htmlFor="group-description"
              >
                <Input
                  id="group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder={t("group_form.description_placeholder")}
                />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {updateGroup.isPending
                  ? t("group.common_saving")
                  : t("group.save_changes")}
              </Button>
            </div>
          </form>
        </Section>

        <Section
          title={t("group.devices")}
          meta={t("group.assigned_count", {
            assigned: assignedIds.size,
            total: allDevices.length,
          })}
        >
          {allDevices.length === 0 ? (
            <StateCard
              icon={<Computer />}
              title={t("group.no_devices_in_inventory")}
              className="py-10"
            />
          ) : (
            <SelectableList
              items={allDevices.map((device) => ({
                id: device.id,
                name: device.name,
                description: device.description,
                meta: device.ipAddress,
              }))}
              selectedIds={assignedIds}
              pendingId={pendingDeviceId}
              disabled={isMutatingRelation}
              onToggle={(device) => handleToggleDevice(device.id)}
            />
          )}
        </Section>

        <Section title={t("group.danger_zone")}>
          <div className="flex flex-col gap-4 rounded-xl border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text as="p" variant="body" className="font-medium">
                {t("group.delete_title")}
              </Text>
              <Text as="p" variant="meta" tone="muted" className="mt-0.5">
                {t("group.delete_hint")}
              </Text>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
            >
              <Trash2 className="size-4" />
              {deleteGroup.isPending ? t("group.deleting") : t("group.delete")}
            </Button>
          </div>
        </Section>
      </div>
    </GroupDetailFrame>
  )
}

function MissingGroup() {
  const { t } = useTranslation("inventory")
  return (
    <GroupDetailFrame>
      <StateCard title={t("group.not_found")} />
    </GroupDetailFrame>
  )
}

export function GroupDetailPage({ id }: { id?: string }) {
  return (
    <AppProviders>
      {id ? <GroupDetailPageInner id={id} /> : <MissingGroup />}
    </AppProviders>
  )
}
