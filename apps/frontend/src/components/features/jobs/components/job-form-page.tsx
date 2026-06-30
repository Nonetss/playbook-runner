"use client"

import {
  ArrowLeft,
  Check,
  Folder,
  Loader2,
  Plus,
  Server,
  Trash2,
} from "lucide-react"
import * as React from "react"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import {
  useJobCreate,
  useJobGet,
  useJobUpdate,
} from "@/components/features/jobs/hooks/useJobs"
import type { InventoryItem } from "@/components/features/jobs/types"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const SELECT_EMPTY_VALUE = "__none__"

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

export type JobFormPageProps = { id?: string }

function InventoryToggleRow({
  name,
  description,
  icon: Icon,
  selected,
  onToggle,
}: {
  name: string
  description?: string | null
  icon: React.ElementType
  selected: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
      >
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input"
          )}
        >
          {selected ? <Check className="size-3" /> : null}
        </span>
        <Icon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{name}</span>
          {description ? (
            <span className="text-muted-foreground block truncate text-xs">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

function JobFormPageInner({ id }: JobFormPageProps) {
  const isEditing = !!id
  const createJob = useJobCreate()
  const updateJob = useJobUpdate()

  const {
    data: job,
    isPending: jobLoading,
    isError: jobError,
  } = useJobGet(id ?? "", { enabled: isEditing })
  const { data: playbooks = [] } = usePlaybooksList()
  const { data: groups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()

  const [values, setValues] = React.useState<FormValues>(EMPTY)
  const [selectedGroups, setSelectedGroups] = React.useState<Set<string>>(
    new Set()
  )
  const [selectedDevices, setSelectedDevices] = React.useState<Set<string>>(
    new Set()
  )
  const [extravars, setExtravars] = React.useState<ExtravarRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isEditing && job) {
      setValues({
        name: job.name,
        description: job.description ?? "",
        playbookId: job.playbookId ?? "",
        cronExpression: job.cronExpression ?? "",
        forks: job.forks,
        enabled: job.enabled,
      })
      const gIds = new Set<string>()
      const dIds = new Set<string>()
      for (const item of job.inventoryJson ?? []) {
        if (item.type === "group") gIds.add(item.id)
        else dIds.add(item.id)
      }
      setSelectedGroups(gIds)
      setSelectedDevices(dIds)
      const evars = Object.entries(job.extravarsJson ?? {}).map(
        ([key, value]) => ({ key, value })
      )
      setExtravars(evars)
    }
  }, [isEditing, job])

  const isSubmitting = createJob.isPending || updateJob.isPending

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function toggleGroup(id: string) {
    setSelectedGroups((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleDevice(id: string) {
    setSelectedDevices((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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

  async function handleSubmit(e: React.FormEvent) {
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
      name: values.name,
      description: values.description || undefined,
      playbookId: values.playbookId || undefined,
      inventoryJson: inventory,
      extravarsJson: extravarsMap,
      forks: values.forks,
      cronExpression: values.cronExpression || undefined,
      enabled: values.enabled,
    }

    try {
      if (isEditing && id) {
        await updateJob.mutateAsync({ id, ...payload })
      } else {
        await createJob.mutateAsync(payload)
      }
      window.location.href = "/jobs"
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el job."
      )
    }
  }

  if (isEditing && jobLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando job…
        </div>
      </main>
    )
  }

  if (isEditing && (jobError || !job)) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el job.
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/jobs">
            <ArrowLeft className="size-4" />
            Volver a jobs
          </a>
        </Button>
      </main>
    )
  }

  const selectionCount = selectedGroups.size + selectedDevices.size

  return (
    <main className="w-full flex-1 p-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
          <a href="/jobs">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar job" : "Nuevo job"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing
              ? "Actualiza la configuración del job."
              : "Configura un job para programar la ejecución de un playbook."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8">
        {/* ── Info ── */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Información
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job-name">
                Nombre<span aria-hidden> *</span>
              </Label>
              <Input
                id="job-name"
                required
                disabled={isSubmitting}
                placeholder="backup-diario"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Descripción</Label>
              <Input
                id="job-description"
                disabled={isSubmitting}
                placeholder="Backup diario de servidores de producción"
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="job-enabled"
              checked={values.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              disabled={isSubmitting}
            />
            <Label htmlFor="job-enabled" className="cursor-pointer">
              {values.enabled ? "Job activo" : "Job desactivado"}
            </Label>
          </div>
        </section>

        {/* ── Playbook ── */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Playbook
          </h2>
          <div className="space-y-2">
            <Label htmlFor="job-playbook">Playbook a ejecutar</Label>
            <Select
              value={values.playbookId || SELECT_EMPTY_VALUE}
              onValueChange={(next) =>
                set("playbookId", next === SELECT_EMPTY_VALUE ? "" : next)
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="job-playbook" className="w-full">
                <SelectValue placeholder="Sin playbook seleccionado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_EMPTY_VALUE}>
                  Sin playbook seleccionado
                </SelectItem>
                {playbooks.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ── Inventario ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Inventario
            </h2>
            <span className="text-muted-foreground text-xs">
              {selectionCount} elemento{selectionCount === 1 ? "" : "s"}{" "}
              seleccionado{selectionCount === 1 ? "" : "s"}
            </span>
          </div>

          {groups.length === 0 && devices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay grupos ni dispositivos. Crea inventario primero.
            </p>
          ) : (
            <div className="rounded-xl border">
              {groups.length > 0 ? (
                <div className="p-3">
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">
                    Grupos
                  </p>
                  <ul className="space-y-0.5">
                    {groups.map((g) => (
                      <InventoryToggleRow
                        key={g.id}
                        name={g.name}
                        description={g.description}
                        icon={Folder}
                        selected={selectedGroups.has(g.id)}
                        onToggle={() => toggleGroup(g.id)}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {groups.length > 0 && devices.length > 0 ? (
                <div className="border-t" />
              ) : null}

              {devices.length > 0 ? (
                <div className="p-3">
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">
                    Dispositivos
                  </p>
                  <ul className="space-y-0.5">
                    {devices.map((d) => (
                      <InventoryToggleRow
                        key={d.id}
                        name={d.name}
                        description={d.ipAddress}
                        icon={Server}
                        selected={selectedDevices.has(d.id)}
                        onToggle={() => toggleDevice(d.id)}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* ── Schedule ── */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Programación
          </h2>
          <div className="space-y-2">
            <Label htmlFor="job-cron">
              Expresión cron{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Input
              id="job-cron"
              disabled={isSubmitting}
              placeholder="0 2 * * *"
              value={values.cronExpression}
              onChange={(e) => set("cronExpression", e.target.value)}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Déjalo vacío para ejecutar solo manualmente. Ejemplo:{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                0 2 * * *
              </code>{" "}
              (cada día a las 2:00).
            </p>
          </div>
        </section>

        {/* ── Options ── */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Opciones de ejecución
          </h2>

          <div className="flex items-center gap-3">
            <Label htmlFor="job-forks" className="w-16 shrink-0 text-sm">
              Forks
            </Label>
            <Input
              id="job-forks"
              type="number"
              min={1}
              max={500}
              value={values.forks}
              onChange={(e) =>
                set("forks", Math.max(1, Number.parseInt(e.target.value) || 1))
              }
              disabled={isSubmitting}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Variables extra</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addExtravar}
                disabled={isSubmitting}
                className="h-7 text-xs"
              >
                <Plus className="size-3" />
                Añadir
              </Button>
            </div>
            {extravars.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Sin variables extra.
              </p>
            ) : (
              <ul className="space-y-2">
                {extravars.map((row, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="VARIABLE"
                      value={row.key}
                      onChange={(e) => updateExtravar(i, "key", e.target.value)}
                      disabled={isSubmitting}
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder="valor"
                      value={row.value}
                      onChange={(e) =>
                        updateExtravar(i, "value", e.target.value)
                      }
                      disabled={isSubmitting}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeExtravar(i)}
                      disabled={isSubmitting}
                      aria-label="Eliminar variable"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pb-4">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <a href="/jobs">Cancelar</a>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando…
              </>
            ) : isEditing ? (
              "Guardar cambios"
            ) : (
              "Crear job"
            )}
          </Button>
        </div>
      </form>
    </main>
  )
}

export function JobFormPage(props: JobFormPageProps) {
  return (
    <AppProviders>
      <JobFormPageInner {...props} />
    </AppProviders>
  )
}
