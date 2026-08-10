import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { RunEvent, RunPhase, RunResult } from "@/features/run/types"

export type RunStreamCallbacks = {
  onEvent: (event: unknown) => void
  onSuccess: (value: RunResult | null | undefined) => void
  onError: (error: unknown) => void
}

export type RunStreamSubscribe<TRequest> = (
  request: TRequest,
  callbacks: RunStreamCallbacks
) => () => void

function formatError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * Shared lifecycle for live run streams. Stopping only detaches the browser
 * from the stream; it deliberately does not claim that the server-side run
 * was terminated.
 */
export function useRunStream<TRequest>(
  subscribe: RunStreamSubscribe<TRequest>
) {
  const { t } = useTranslation("common")
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [events, setEvents] = useState<RunEvent[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const requestRef = useRef<TRequest | null>(null)
  const generationRef = useRef(0)

  const detach = useCallback(() => {
    generationRef.current += 1
    try {
      unsubscribeRef.current?.()
    } catch {
      // The stream is already unusable; local state must still recover.
    } finally {
      unsubscribeRef.current = null
    }
  }, [])

  const start = useCallback(
    (request: TRequest) => {
      detach()
      requestRef.current = request
      setEvents([])
      setResult(null)
      setErrorMessage(null)
      setPhase("running")

      const generation = generationRef.current
      unsubscribeRef.current = subscribe(request, {
        onEvent: (event) => {
          if (generation !== generationRef.current) return
          setEvents((prev) => [...prev, event as RunEvent])
        },
        onSuccess: (value) => {
          if (generation !== generationRef.current) return
          if (value) setResult(value)
          unsubscribeRef.current = null
          setPhase("done")
        },
        onError: (error) => {
          if (generation !== generationRef.current) return
          unsubscribeRef.current = null
          setErrorMessage(formatError(error, t("run_console.connection_error")))
          setPhase("error")
        },
      })
    },
    [detach, subscribe, t]
  )

  const stopWatching = useCallback(() => {
    if (phase !== "running") return
    detach()
    setPhase("cancelled")
  }, [detach, phase])

  const retry = useCallback(() => {
    if (requestRef.current) start(requestRef.current)
  }, [start])

  const reset = useCallback(() => {
    detach()
    requestRef.current = null
    setPhase("idle")
    setEvents([])
    setResult(null)
    setErrorMessage(null)
  }, [detach])

  useEffect(() => detach, [detach])

  return {
    phase,
    events,
    result,
    errorMessage,
    start,
    stopWatching,
    retry,
    reset,
  }
}
