"use client"

import { ArrowLeft, Check, Loader2, Server, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  useDeviceGroupAssign,
  useDeviceGroupsByGroup,
  useDeviceGroupUnassign,
} from "@/components/features/inventory/hooks/useDeviceGroups"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import {
  useGroupDelete,
  useGroupGet,
  useGroupUpdate,
} from "@/components/features/inventory/hooks/useGroups"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useConfirm } from "@/hooks/useConfirm"
import { cn } from "@/lib/utils"

function GroupDetailPageInner({ id }: { id: string }) {
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

  async function handleSave(e: React.FormEvent) {
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
      title: `Eliminar "${group.name}"`,
      description:
        "Esta acción eliminará el grupo y todas sus asignaciones de dispositivos. No se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })
    if (!confirmed) return
    await deleteGroup.mutateAsync({ id: group.id })
    window.location.href = "/inventory"
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
          Cargando grupo…
        </div>
      </main>
    )
  }

  if (isError || !group) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el grupo.
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/inventory">
            <ArrowLeft className="size-4" />
            Volver al inventario
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
          <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Información
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nombre</Label>
                <Input
                  id="group-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder="webservers"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-description">Descripción</Label>
                <Input
                  id="group-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={updateGroup.isPending}
                  placeholder="Servidores web de producción"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateGroup.isPending}>
                {updateGroup.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Dispositivos ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dispositivos
            </h2>
            <span className="text-muted-foreground text-xs">
              {assignedIds.size} de {allDevices.length} asignado
              {assignedIds.size === 1 ? "" : "s"}
            </span>
          </div>

          {allDevices.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No hay dispositivos. Crea alguno en el inventario primero.
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
                      <Server className="text-muted-foreground size-4 shrink-0" />
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zona de peligro
          </h2>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Eliminar grupo</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Elimina el grupo y desvincula todos sus dispositivos. Esta
                  acción no se puede deshacer.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteGroup.isPending}
              >
                <Trash2 className="size-4" />
                {deleteGroup.isPending ? "Eliminando…" : "Eliminar"}
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
          <p className="text-muted-foreground text-sm">Grupo no encontrado.</p>
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
