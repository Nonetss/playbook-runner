import { consumeEventIterator } from "@orpc/client"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  isTransportError,
  MAX_REATTACH_ATTEMPTS,
  reattachDelay,
} from "@/features/jobs/lib/run-watch-retry"
import type { InventoryItem, Job, JobRunEvent } from "@/features/jobs/types"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { client, orpc } from "@/lib/orpc"

// ── Queries ──────────────────────────────────────────────────────────────────

export const useJobsList = () => useHydratedQuery(orpc.jobs.list.queryOptions())

export const useJobGet = (id: string, options?: { enabled?: boolean }) =>
  useHydratedQuery(
    orpc.jobs.get.queryOptions({
      input: { id },
      enabled: !!id && (options?.enabled ?? true),
    })
  )

/** Runs fetched per scroll batch in a job's history panel. */
const JOB_RUNS_PAGE_SIZE = 15

/**
 * A job's runs, newest first, loaded in offset batches as the history panel
 * scrolls. Never polls: the app's run-change subscription
 * (`useJobRunChanges`) invalidates it whenever a run of this job starts or
 * finishes, wherever it was started.
 *
 * Like `useJobRunsAll`, not hydration-gated: the island mounts via
 * `client:only`, so the first request fires post-hydration in practice.
 */
export function useJobRunsList(jobId: string, options?: { enabled?: boolean }) {
  return useInfiniteQuery(
    orpc.jobs.runs.list.infiniteOptions({
      input: (offset: number) => ({
        jobId,
        limit: JOB_RUNS_PAGE_SIZE,
        offset,
      }),
      initialPageParam: 0,
      getNextPageParam: (last, all) =>
        last.length < JOB_RUNS_PAGE_SIZE
          ? undefined
          : all.length * JOB_RUNS_PAGE_SIZE,
      enabled: !!jobId && (options?.enabled ?? true),
    })
  )
}

/** Fetch a single run; refreshed by the run-change subscription when it finishes. */
export const useJobRunGet = (
  id: string | null,
  options?: { enabled?: boolean }
) =>
  useHydratedQuery(
    orpc.jobs.runs.get.queryOptions({
      input: { id: id ?? "" },
      enabled: !!id && (options?.enabled ?? true),
    })
  )

/**
 * Infinite query over the cross-job run feed (`jobs.runs.listAll`). Each
 * page carries `nextCursor`; we thread it through as the TanStack
 * `pageParam` so load-more picks up exactly where the previous batch ended.
 * Kept current by the run-change subscription instead of polling.
 *
 * Note: hydration gating for infinite queries would require a custom wrapper
 * around `useInfiniteQuery` (since `InfiniteQueryObserverResult` is a
 * discriminated union that can't be naively widened). The island mounts via
 * `client:only`, so the first request fires post-hydration in practice.
 */
export function useJobRunsAll(options?: { pageSize?: number }) {
  const limit = options?.pageSize ?? 25
  return useInfiniteQuery(
    orpc.jobs.runs.listAll.infiniteOptions({
      input: (cursor) => ({ limit, cursor: cursor ?? undefined }),
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    })
  )
}

/**
 * Aggregate run metrics over a fixed window (24h / 7d / 30d), recomputed
 * whenever the run-change subscription reports a run starting or finishing.
 */
export function useJobRunMetrics(window: "24h" | "7d" | "30d") {
  return useHydratedQuery(
    orpc.jobs.runs.metrics.queryOptions({
      input: { window },
    })
  )
}

/**
 * Per-job rollups: latest status + recent success ratio (last 10 runs),
 * refreshed by the run-change subscription.
 */
export function useJobRunRollups() {
  return useHydratedQuery(
    orpc.jobs.runs.rollups.queryOptions({
      input: {},
    })
  )
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

const listKey = orpc.jobs.list.queryKey()

const detailKey = (input: { id: string }) =>
  orpc.jobs.get.queryKey({ input: { id: input.id } })

type CreateInput = {
  name: string
  description?: string | null
  playbookId?: string | null
  inventoryJson?: InventoryItem[]
  extravarsJson?: Record<string, string>
  forks?: number
  cronExpression?: string | null
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
          description:
            input.description !== undefined ? input.description : j.description,
          playbookId:
            input.playbookId !== undefined ? input.playbookId : j.playbookId,
          inventoryJson: input.inventoryJson ?? j.inventoryJson,
          extravarsJson: input.extravarsJson ?? j.extravarsJson,
          forks: input.forks ?? j.forks,
          cronExpression:
            input.cronExpression !== undefined
              ? input.cronExpression
              : j.cronExpression,
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

export const useJobCreate = () => {
  const { t } = useTranslation("jobs")
  return useResourceMutation<CreateInput, Job, Job[]>({
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
    messages: { success: t("toast.created"), error: t("toast.create_error") },
  })
}

export const useJobUpdate = () => {
  const { t } = useTranslation("jobs")
  return useResourceMutation<UpdateInput, Job, Job[]>({
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
    detailKey,
    applyOptimistic: applyUpdate,
    messages: { success: t("toast.updated"), error: t("toast.update_error") },
  })
}

export const useJobDelete = () => {
  const { t } = useTranslation("jobs")
  return useResourceMutation<{ id: string }, Job, Job[]>({
    mutationFn: (input) => orpc.jobs.delete.call(input) as Promise<Job>,
    listKey,
    detailKey,
    removeDetail: true,
    applyOptimistic: applyDelete,
    messages: { success: t("toast.deleted"), error: t("toast.delete_error") },
  })
}

export const useJobToggleEnabled = () => {
  const { t } = useTranslation("jobs")
  return useResourceMutation<{ id: string; enabled: boolean }, Job, Job[]>({
    mutationFn: (input) => orpc.jobs.toggleEnabled.call(input) as Promise<Job>,
    listKey,
    detailKey,
    applyOptimistic: applyToggle,
    messages: { success: t("toast.toggled"), error: t("toast.toggle_error") },
  })
}

/**
 * Trigger an immediate run of a job. The backend records the run and streams
 * the playbook in the background, so this resolves quickly with the new run id;
 * the run-change subscription then refreshes every view that lists it.
 */
export const useJobRun = () => {
  const { t } = useTranslation("jobs")
  return useOrpcMutation({
    mutationFn: (input: { id: string }) =>
      orpc.jobs.run.call(input) as Promise<{ runId: string | null }>,
    success: t("toast.run_started"),
    error: t("toast.run_error"),
  })
}

export type JobRunWatchPhase =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "cancelled"

export type JobRunWatchResult = {
  runId: string
  status: "ok" | "failed"
  ok: boolean
}

/**
 * Attach to a run's live events (`jobs.runs.watch`) — whether it was just
 * triggered from this tab, is a cron-scheduled run already in progress, or
 * was started from another tab entirely. Replays whatever already happened
 * before subscribing, then streams the rest. `watchingRunId` lets a caller
 * check which run (if any) this hook is currently attached to, so it can
 * decide whether to (re)attach as the run list changes.
 *
 * `phase` settles to `"idle"` (not `"done"`) if the run turns out not to
 * have been live at all (already finished, or never existed) — nothing to
 * show; the caller should rely on the stored data for it instead.
 *
 * A watch that loses its connection (not one the API refuses) reattaches on
 * its own with backoff while `phase` stays `"running"` and `reconnecting` is
 * on. The new watch replays the run from its first event in the same order,
 * so the events already shown are skipped instead of drawn twice.
 */
export function useJobRunWatch() {
  const { t } = useTranslation("jobs")
  const [watchingRunId, setWatchingRunId] = useState<string | null>(null)
  const [phase, setPhase] = useState<JobRunWatchPhase>("idle")
  const [events, setEvents] = useState<JobRunEvent[]>([])
  const [result, setResult] = useState<JobRunWatchResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const unsubscribeRef = useRef<(() => Promise<void>) | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = useRef(0)

  const detach = useCallback(() => {
    generationRef.current += 1
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    setReconnecting(false)
    // A stream that is already unusable rejects here; local state must
    // still recover.
    unsubscribeRef.current?.().catch(() => {})
    unsubscribeRef.current = null
  }, [])

  const start = useCallback(
    (runId: string) => {
      detach()

      setWatchingRunId(runId)
      setEvents([])
      setResult(null)
      setErrorMessage(null)
      setPhase("running")

      const generation = generationRef.current
      const isCurrent = () => generation === generationRef.current
      /** Events of this run already on screen, across reattaches. */
      let shown = 0
      /** Reattaches in a row that have not reached the backend yet. */
      let attempt = 0

      const attach = () => {
        /** Events of this attach so far; the first `shown` are its replay. */
        let received = 0
        const watch = client.v1.jobs.runs.watch({ runId })
        // Resolves once the backend answered, before any event: the
        // connection is back even if the run is silent right now.
        watch.then(
          () => {
            if (!isCurrent()) return
            attempt = 0
            setReconnecting(false)
          },
          () => {
            // Handled by `onError` below.
          }
        )
        unsubscribeRef.current = consumeEventIterator(watch, {
          onEvent: (event) => {
            if (!isCurrent()) return
            received += 1
            if (received <= shown) return
            shown = received
            setEvents((prev) => [...prev, event as JobRunEvent])
          },
          onSuccess: (value) => {
            if (!isCurrent()) return
            unsubscribeRef.current = null
            setReconnecting(false)
            if (value) {
              setResult(value)
              setPhase("done")
            } else {
              setPhase("idle")
            }
          },
          onError: (err) => {
            if (!isCurrent()) return
            unsubscribeRef.current = null
            if (isTransportError(err) && attempt < MAX_REATTACH_ATTEMPTS) {
              attempt += 1
              setReconnecting(true)
              retryTimerRef.current = setTimeout(() => {
                retryTimerRef.current = null
                if (isCurrent()) attach()
              }, reattachDelay(attempt))
              return
            }
            setReconnecting(false)
            setErrorMessage(
              err instanceof Error ? err.message : t("toast.network_error")
            )
            setPhase("error")
          },
        })
      }

      attach()
    },
    [detach, t]
  )

  const stopWatching = useCallback(() => {
    if (phase !== "running") return
    detach()
    setPhase("cancelled")
  }, [detach, phase])

  const reset = useCallback(() => {
    detach()
    setWatchingRunId(null)
    setPhase("idle")
    setEvents([])
    setResult(null)
    setErrorMessage(null)
  }, [detach])

  useEffect(() => detach, [detach])

  return {
    watchingRunId,
    phase,
    events,
    result,
    errorMessage,
    reconnecting,
    start,
    stopWatching,
    reset,
  }
}
