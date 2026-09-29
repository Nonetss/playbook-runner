import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")
const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import * as React from "react"
import { Trans, useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { StateCard } from "@/components/shared/feedback/state-card"
import { FieldLabel, FormField } from "@/components/shared/form/field-label"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import { CronScheduleDialog } from "@/features/jobs/components/cron-schedule-dialog"
import {
  useJobCreate,
  useJobGet,
  useJobUpdate,
} from "@/features/jobs/hooks/use-jobs"
import type { InventoryItem, Job } from "@/features/jobs/types"
import { usePlaybooksList } from "@/features/playbooks/hooks/use-playbooks"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { navigate } from "@/lib/navigate"
import { cn } from "@/lib/utils"

const NATIVE_SELECT_CLASS = cn(
  "border-input bg-transparent shadow-xs dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-ring/50",
  "flex h-9 w-full min-w-0 appearance-none rounded-md border px-3 py-2 text-sm",
  "outline-none focus-visible:ring-[3px]",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

type ExtravarRow = { key: string; value: string }

type FormValues = {
  name: string
  description: string
  playbookId: string
  cronExpression: string
  forks: number
  enabled: boolean
}

const EMPTY: FormValues = {
  name: "",
  description: "",
  playbookId: "",
  cronExpression: "",
  forks: 1,
  enabled: true,
}

function valuesFromJob(job: Job): FormValues {
  return {
    name: job.name,
    description: job.description ?? "",
    playbookId: job.playbookId ?? "",
    cronExpression: job.cronExpression ?? "",
    forks: job.forks,
    enabled: job.enabled,
  }
}

function inventoryFromJob(inventoryJson: InventoryItem[] | null | undefined): {
  groups: Set<string>
  devices: Set<string>
} {
  const groups = new Set<string>()
  const devices = new Set<string>()
  for (const item of inventoryJson ?? []) {
    if (item.type === "group") groups.add(item.id)
    else devices.add(item.id)
  }
  return { groups, devices }
}

export type JobFormPageProps = { id?: string }

function JobFormPageInner({ id }: JobFormPageProps) {
  const isEditing = !!id
  const {
    data: job,
    isPending: jobLoading,
    isError: jobError,
  } = useJobGet(id ?? "", { enabled: isEditing })

  if (isEditing && jobLoading) {
    return <JobFormLoading />
  }

  if (isEditing && (jobError || !job)) {
    return <JobFormLoadError />
  }

  // Remount when the job id changes so edit mode seeds state from the loaded
  // row on the first paint — no post-paint useEffect that flashes empty fields.
  return <JobForm key={job?.id ?? "new"} id={id} initialJob={job ?? null} />
}

function JobFormFrame({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("jobs")
  return (
    <DetailFrame backHref="/jobs/scheduler" backLabel={t("form.back_to_jobs")}>
      {children}
    </DetailFrame>
  )
}

function JobFormLoading() {
  const { t } = useTranslation("jobs")
  return (
    <JobFormFrame>
      <StateCard spinner title={t("form.loading")} />
    </JobFormFrame>
  )
}

function JobFormLoadError() {
  const { t } = useTranslation("jobs")
  return (
    <JobFormFrame>
      <StateCard tone="destructive" title={t("form.load_error")} />
    </JobFormFrame>
  )
}

/** A titled form section: label-role heading, optional aside, then body. */
function FormSection({
  title,
  aside,
  children,
}: {
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <Text as="h2" variant="label" tone="muted">
          {title}
        </Text>
        {aside}
      </div>
      {children}
    </section>
  )
}

function JobForm({ id, initialJob }: { id?: string; initialJob: Job | null }) {
  const { t } = useTranslation("jobs")
  const { t: tCommon } = useTranslation("common")
  const isEditing = !!id
  const createJob = useJobCreate()
  const updateJob = useJobUpdate()

  const { data: playbooks = [] } = usePlaybooksList()
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()

  const initialInventory = inventoryFromJob(initialJob?.inventoryJson)
  const [values, setValues] = React.useState<FormValues>(() =>
    initialJob ? valuesFromJob(initialJob) : EMPTY
  )
  const [selectedGroups, setSelectedGroups] = React.useState<Set<string>>(
    () => initialInventory.groups
  )
  const [selectedDevices, setSelectedDevices] = React.useState<Set<string>>(
    () => initialInventory.devices
  )
  const [extravars, setExtravars] = React.useState<ExtravarRow[]>(() =>
    Object.entries(initialJob?.extravarsJson ?? {}).map(([key, value]) => ({
      key,
      value,
    }))
  )
  const [error, setError] = React.useState<string | null>(null)

  const isSubmitting = createJob.isPending || updateJob.isPending

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function addExtravar() {
    setExtravars((e) => [...e, { key: "", value: "" }])
  }

  function removeExtravar(i: number) {
    setExtravars((e) => e.filter((_, j) => j !== i))
  }

  function updateExtravar(i: number, field: "key" | "value", value: string) {
    setExtravars((e) =>
      e.map((x, j) => (j === i ? { ...x, [field]: value } : x))
    )
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const inventory: InventoryItem[] = [
      ...[...selectedGroups].map((id) => ({ id, type: "group" as const })),
      ...[...selectedDevices].map((id) => ({ id, type: "device" as const })),
    ]

    const extravarsMap = Object.fromEntries(
      extravars.filter((x) => x.key.trim()).map((x) => [x.key.trim(), x.value])
    )

    const payload = {
      name: values.name.trim(),
      // Always send explicit null so the API never treats a missing key as
      // "clear" by accident while the field still had a value in the UI.
      description: values.description.trim() || null,
      playbookId: values.playbookId || null,
      inventoryJson: inventory,
      extravarsJson: extravarsMap,
      forks: values.forks,
      cronExpression: values.cronExpression.trim() || null,
      enabled: values.enabled,
    }

    try {
      if (isEditing && id) {
        await updateJob.mutateAsync({ id, ...payload })
      } else {
        await createJob.mutateAsync(payload)
      }
      navigate("/jobs/scheduler")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("form.save_error"))
    }
  }

  const selectionCount = selectedGroups.size + selectedDevices.size
  const hasInventory = groups.length > 0 || devices.length > 0

  return (
    <JobFormFrame>
      <PageHero
        surface="scheduler"
        title={isEditing ? t("form.edit_title") : t("form.create_title")}
        description={
          isEditing ? t("form.edit_subtitle") : t("form.create_subtitle")
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-10">
        <FormSection title={t("form.info_section")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("form.name_label")} htmlFor="job-name" required>
              <Input
                id="job-name"
                required
                disabled={isSubmitting}
                placeholder={t("form.name_placeholder")}
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </FormField>
            <FormField
              label={t("form.description_label")}
              htmlFor="job-description"
            >
              <Input
                id="job-description"
                name="job-description"
                autoComplete="off"
                disabled={isSubmitting}
                placeholder={t("form.description_placeholder")}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3">
            <div className="min-w-0">
              <Text
                as="label"
                variant="headline"
                htmlFor="job-enabled"
                className="cursor-pointer text-sm"
              >
                {values.enabled ? t("form.active") : t("form.inactive")}
              </Text>
              <Text as="p" variant="meta" tone="muted" className="mt-0.5">
                {t("form.enabled_hint")}
              </Text>
            </div>
            <Switch
              id="job-enabled"
              checked={values.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              disabled={isSubmitting}
            />
          </div>
        </FormSection>

        <FormSection title={t("form.playbook_section")}>
          <FormField label={t("form.playbook_label")} htmlFor="job-playbook">
            {/*
              Native <select> on purpose: Radix Select mounts a hidden form
              control that emits spurious change/"" events inside <form>, which
              wiped playbookId (and interacted badly with controlled fields)
              when hydrating an existing job.
            */}
            <select
              id="job-playbook"
              disabled={isSubmitting}
              value={values.playbookId}
              onChange={(e) => set("playbookId", e.target.value)}
              className={NATIVE_SELECT_CLASS}
            >
              <option value="">{t("form.playbook_placeholder")}</option>
              {playbooks
                .filter((p) => !p.missing || p.id === values.playbookId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection
          title={t("form.inventory_section")}
          aside={
            <div className="flex items-center gap-3">
              <Text variant="meta" tone="muted" className="tabular-nums">
                <Trans
                  i18nKey="form.inventory_selected"
                  ns="jobs"
                  count={selectionCount}
                />
              </Text>
              {selectionCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setSelectedGroups(new Set())
                    setSelectedDevices(new Set())
                  }}
                  disabled={isSubmitting}
                >
                  {t("form.inventory_clear")}
                </Button>
              ) : null}
            </div>
          }
        >
          {hasInventory ? (
            <div className="rounded-xl border bg-card/40 p-3">
              <InventorySelectionList
                groups={groups}
                devices={devices}
                selectedGroups={selectedGroups}
                selectedDevices={selectedDevices}
                onToggleGroup={(groupId) =>
                  setSelectedGroups((current) => {
                    const next = new Set(current)
                    next.has(groupId) ? next.delete(groupId) : next.add(groupId)
                    return next
                  })
                }
                onToggleDevice={(deviceId) =>
                  setSelectedDevices((current) => {
                    const next = new Set(current)
                    next.has(deviceId)
                      ? next.delete(deviceId)
                      : next.add(deviceId)
                    return next
                  })
                }
                labels={{
                  groups: t("form.groups_label"),
                  devices: t("form.devices_label"),
                  searchPlaceholder: t("form.inventory_search_placeholder"),
                  noResults: t("form.inventory_no_results"),
                  emptyInventory: t("form.no_inventory"),
                  noMatch: t("form.inventory_no_match"),
                }}
                searchable
                collapsible
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <StateCard className="py-8" title={t("form.no_inventory")} />
          )}
        </FormSection>

        <FormSection title={t("form.schedule_section")}>
          <FormField
            label={
              <>
                {t("form.cron_label")}{" "}
                <span className="normal-case tracking-normal">
                  {t("form.cron_optional")}
                </span>
              </>
            }
            htmlFor="job-cron"
            hint={
              <Trans
                i18nKey="form.cron_hint"
                ns="jobs"
                components={{
                  code: (
                    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs" />
                  ),
                }}
              />
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="job-cron"
                disabled={isSubmitting}
                placeholder="0 2 * * *"
                value={values.cronExpression}
                onChange={(e) => set("cronExpression", e.target.value)}
                className="font-mono tabular-nums sm:flex-1"
              />
              <CronScheduleDialog
                expression={values.cronExpression}
                onApply={(expression) => set("cronExpression", expression)}
                disabled={isSubmitting}
              />
            </div>
          </FormField>
        </FormSection>

        <FormSection title={t("form.options_section")}>
          <FormField label={t("form.forks_label")} htmlFor="job-forks">
            <Input
              id="job-forks"
              type="number"
              min={1}
              max={50}
              value={values.forks}
              onChange={(e) =>
                set(
                  "forks",
                  Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                )
              }
              disabled={isSubmitting}
              className="w-24 font-mono tabular-nums"
            />
          </FormField>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>{t("form.extravars_label")}</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtravar}
                disabled={isSubmitting}
              >
                <Plus className="size-3.5" />
                {t("form.extravars_add")}
              </Button>
            </div>
            {extravars.length === 0 ? (
              <StateCard className="py-6" title={t("form.no_extravars")} />
            ) : (
              <ul className="space-y-2">
                {extravars.map((row, i) => (
                  <li key={i} className="flex min-w-0 items-center gap-2">
                    <Input
                      placeholder={t("form.extravars_key_placeholder")}
                      value={row.key}
                      onChange={(e) => updateExtravar(i, "key", e.target.value)}
                      disabled={isSubmitting}
                      className="min-w-0 flex-1 font-mono text-xs"
                    />
                    <Input
                      placeholder={t("form.extravars_value_placeholder")}
                      value={row.value}
                      onChange={(e) =>
                        updateExtravar(i, "value", e.target.value)
                      }
                      disabled={isSubmitting}
                      className="min-w-0 flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeExtravar(i)}
                      disabled={isSubmitting}
                      aria-label={t("form.extravars_remove_aria")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FormSection>

        {error ? <InlineAlert>{error}</InlineAlert> : null}

        <div className="sticky bottom-0 z-10 -mb-6 border-t bg-background/95 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex justify-end gap-2">
            <Button
              asChild
              type="button"
              variant="outline"
              disabled={isSubmitting}
            >
              <AppLink href="/jobs/scheduler">
                {tCommon("actions.cancel")}
              </AppLink>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isSubmitting
                ? t("form.saving")
                : isEditing
                  ? t("form.save_changes")
                  : t("form.create")}
            </Button>
          </div>
        </div>
      </form>
    </JobFormFrame>
  )
}

export function JobFormPage(props: JobFormPageProps) {
  return (
    <AppProviders>
      <JobFormPageInner {...props} />
    </AppProviders>
  )
}
