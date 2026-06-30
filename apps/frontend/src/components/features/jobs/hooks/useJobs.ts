"use client"

import { useQuery } from "@tanstack/react-query"
import type { InventoryItem, Job, JobRun } from "@/components/features/jobs/types"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

// ── Queries ──────────────────────────────────────────────────────────────────

export const useJobsList = () => useQuery(orpc.jobs.list.queryOptions())

export const useJobGet = (id: string, options?: { enabled?: boolean }) =>
  useQuery(
    orpc.jobs.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )

export const useJobRunsList = (jobId: string, options?: { enabled?: boolean }) =>
  useQuery(
    orpc.jobs.runs.list.queryOptions({
      input: { jobId },
      enabled: !!jobId && (options?.enabled ?? true),
    })
  )

// ── Mutation helpers ──────────────────────────────────────────────────────────

const listKey = orpc.jobs.list.queryKey()

type CreateInput = {
  name: string
  description?: string
  playbookId?: string
  inventoryJson?: InventoryItem[]
  extravarsJson?: Record<string, string>
  forks?: number
  cronExpression?: string
  enabled?: boolean
}

type UpdateInput = CreateInput & { id: string }

function applyCreate(current: Job[] | undefined, input: CreateInput) {
  if (!current) return current
  return [
    ...current,
    {
      id: `__optimistic_${Date.now()}`,
      name: input.name,
      description: input.description ?? null,
      playbookId: input.playbookId ?? null,
      inventoryJson: input.inventoryJson ?? [],
      extravarsJson: input.extravarsJson ?? {},
      forks: input.forks ?? 1,
      cronExpression: input.cronExpression ?? null,
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Job,
  ]
}

function applyUpdate(current: Job[] | undefined, input: UpdateInput) {
  if (!current) return current
  return current.map((j) =>
    j.id === input.id
      ? {
          ...j,
          name: input.name ?? j.name,
          description: input.description ?? j.description,
          playbookId: input.playbookId ?? j.playbookId,
          inventoryJson: input.inventoryJson ?? j.inventoryJson,
          extravarsJson: input.extravarsJson ?? j.extravarsJson,
          forks: input.forks ?? j.forks,
          cronExpression: input.cronExpression ?? j.cronExpression,
          enabled: input.enabled ?? j.enabled,
        }
      : j
  )
}

function applyDelete(current: Job[] | undefined, input: { id: string }) {
  if (!current) return current
  return current.filter((j) => j.id !== input.id)
}

function applyToggle(
  current: Job[] | undefined,
  input: { id: string; enabled: boolean }
) {
  if (!current) return current
  return current.map((j) =>
    j.id === input.id ? { ...j, enabled: input.enabled } : j
  )
}

// ── Mutations ────────────────────────────────────────────────────────────────

export const useJobCreate = () =>
  useResourceMutation<CreateInput, Job, Job[]>({
    mutationFn: (input) =>
      orpc.jobs.create.call({
        name: input.name,
        description: input.description,
        playbookId: input.playbookId,
        inventoryJson: input.inventoryJson ?? [],
        extravarsJson: input.extravarsJson ?? {},
        forks: input.forks ?? 1,
        cronExpression: input.cronExpression,
        enabled: input.enabled ?? true,
      }) as Promise<Job>,
    listKey,
    applyOptimistic: applyCreate,
    messages: { success: "Job creado", error: "No se pudo crear el job" },
  })

export const useJobUpdate = () =>
  useResourceMutation<UpdateInput, Job, Job[]>({
    mutationFn: (input) =>
      orpc.jobs.update.call({
        id: input.id,
        name: input.name,
        description: input.description,
        playbookId: input.playbookId,
        inventoryJson: input.inventoryJson ?? [],
        extravarsJson: input.extravarsJson ?? {},
        forks: input.forks ?? 1,
        cronExpression: input.cronExpression,
        enabled: input.enabled ?? true,
      }) as Promise<Job>,
    listKey,
    applyOptimistic: applyUpdate,
    messages: { success: "Job actualizado", error: "No se pudo actualizar el job" },
  })

export const useJobDelete = () =>
  useResourceMutation<{ id: string }, Job, Job[]>({
    mutationFn: (input) => orpc.jobs.delete.call(input) as Promise<Job>,
    listKey,
    applyOptimistic: applyDelete,
    messages: { success: "Job eliminado", error: "No se pudo eliminar el job" },
  })

export const useJobToggleEnabled = () =>
  useResourceMutation<{ id: string; enabled: boolean }, Job, Job[]>({
    mutationFn: (input) =>
      orpc.jobs.toggleEnabled.call(input) as Promise<Job>,
    listKey,
    applyOptimistic: applyToggle,
    messages: {
      success: "Estado del job actualizado",
      error: "No se pudo cambiar el estado del job",
    },
  })

export const useJobRunCreate = () =>
  useResourceMutation<{ jobId: string }, JobRun, JobRun[]>({
    mutationFn: (input) =>
      orpc.jobs.runs.create.call(input) as Promise<JobRun>,
    listKey: orpc.jobs.runs.list.queryKey({ input: { jobId: "" } }),
    applyOptimistic: (current, input) => {
      if (!current) return current
      const run: JobRun = {
        id: `__optimistic_${Date.now()}`,
        jobId: input.jobId,
        status: "pending",
        startedAt: null,
        finishedAt: null,
        createdAt: new Date().toISOString(),
      }
      return [run, ...current]
    },
    messages: {
      success: "Ejecución registrada",
      error: "No se pudo registrar la ejecución",
    },
  })
