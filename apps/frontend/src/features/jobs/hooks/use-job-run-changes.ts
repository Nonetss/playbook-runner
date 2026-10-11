import { consumeEventIterator } from "@orpc/client"
import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { emitRunChange, onRunChange } from "@/features/jobs/lib/run-change-bus"
import {
  isTransportError,
  reattachDelay,
} from "@/features/jobs/lib/run-watch-retry"
import type { JobRunChange } from "@/features/jobs/types"
import { client, orpc } from "@/lib/orpc"

/** Marks every run-derived query stale; mounted ones refetch at once. */
function invalidateAllRuns(queryClient: QueryClient) {
  for (const queryKey of [
    orpc.jobs.runs.list.key(),
    orpc.jobs.runs.get.key(),
    orpc.jobs.runs.listAll.key(),
    orpc.jobs.runs.metrics.key(),
    orpc.jobs.runs.rollups.key(),
  ]) {
    queryClient.invalidateQueries({ queryKey })
  }
}

/** Marks stale what one run starting or finishing can have changed. */
function invalidateRun(queryClient: QueryClient, change: JobRunChange) {
  for (const queryKey of [
    orpc.jobs.runs.list.key({ input: { jobId: change.jobId } }),
    orpc.jobs.runs.get.queryKey({ input: { id: change.runId } }),
    orpc.jobs.runs.listAll.key(),
    orpc.jobs.runs.metrics.key(),
    orpc.jobs.runs.rollups.key(),
  ]) {
    queryClient.invalidateQueries({ queryKey })
  }
}

/**
 * Follows `jobs.runs.watchChanges` while `enabled`, keeping every run view
 * current: each run starting or finishing invalidates the queries it can
 * have changed (inactive ones too, so a page navigated to later refetches
 * despite `staleTime`) and is re-emitted on the in-page run change bus.
 *
 * Mounted once, in the persisted authenticated navbar, so one stream serves
 * every island across navigations. A lost or ended stream reconnects with
 * backoff for as long as it is enabled; once it is listening again, every
 * run query is refreshed so nothing that changed meanwhile is missed. An API
 * refusal (the session ended or is still pending) stops it.
 */
export function useJobRunChanges({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    let stopped = false
    let unsubscribe: (() => Promise<void>) | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    /** Reconnects in a row that have not reached the backend yet. */
    let attempt = 0
    /** The first `subscribed` comes with a cache this page just loaded. */
    let subscribedBefore = false

    const reconnect = () => {
      unsubscribe = null
      attempt += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        if (!stopped) connect()
      }, reattachDelay(attempt))
    }

    function connect() {
      unsubscribe = consumeEventIterator(client.v1.jobs.runs.watchChanges(), {
        onEvent: (event) => {
          if (stopped) return
          if (event.type === "subscribed") {
            attempt = 0
            if (subscribedBefore) invalidateAllRuns(queryClient)
            subscribedBefore = true
            return
          }
          const { type: _type, ...change } = event
          invalidateRun(queryClient, change)
          emitRunChange(change)
        },
        onSuccess: () => {
          // The backend closed the stream (e.g. it is restarting).
          if (!stopped) reconnect()
        },
        onError: (error) => {
          if (stopped) return
          if (isTransportError(error)) reconnect()
          else unsubscribe = null
        },
      })
    }

    connect()

    return () => {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      // A call still failing rejects here too; there is nothing to release.
      unsubscribe?.().catch(() => {})
    }
  }, [enabled, queryClient])
}

/**
 * Calls `listener` for every run change the app's subscription receives.
 * The latest `listener` is always used, so passing a new one each render
 * never resubscribes.
 */
export function useOnRunChange(listener: (change: JobRunChange) => void) {
  const listenerRef = useRef(listener)
  listenerRef.current = listener
  useEffect(() => onRunChange((change) => listenerRef.current(change)), [])
}
