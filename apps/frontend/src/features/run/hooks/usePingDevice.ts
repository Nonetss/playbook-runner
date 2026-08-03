import { consumeEventIterator } from "@orpc/client"
import { useCallback, useRef, useState } from "react"
import type { RunEvent, RunPhase, RunResult } from "@/features/run/types"
import { client } from "@/lib/orpc"

export type { RunEvent, RunResult } from "@/features/run/types"

/**
 * Drives a device ping: opens the `run.ping` event iterator over `/rpc`,
 * accumulates events, and exposes the phase/result so a component can render
 * a live console.
 */
export function usePingDevice() {
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [events, setEvents] = useState<RunEvent[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const start = useCallback((deviceId: string) => {
    unsubscribeRef.current?.()

    setEvents([])
    setResult(null)
    setErrorMessage(null)
    setPhase("running")

    unsubscribeRef.current = consumeEventIterator(
      client.v1.run.ping({ deviceId }),
      {
        onEvent: (event) => setEvents((prev) => [...prev, event as RunEvent]),
        onSuccess: (value) => {
          if (value) setResult(value)
          setPhase("done")
        },
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : "Error de red")
          setPhase("error")
        },
      }
    )
  }, [])

  const reset = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    setPhase("idle")
    setEvents([])
    setResult(null)
    setErrorMessage(null)
  }, [])

  return { phase, events, result, errorMessage, start, reset }
}
