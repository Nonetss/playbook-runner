import { consumeEventIterator } from "@orpc/client"
import { useCallback, useRef, useState } from "react"
import { client } from "@/lib/orpc"

/** A single inventory selection forwarded to the run endpoint. */
export type RunSelection = {
  id: string
  type: "group" | "device"
}

/** Per-event payload streamed by the backend's `run.*` oRPC procedures. */
export type RunEvent = {
  event: string
  host?: string
  play?: string
  task?: string
  task_action?: string
  changed?: boolean
  msg?: string
  stdout?: string
  stderr?: string
  rc?: number
  stats?: {
    ok: Record<string, number>
    changed: Record<string, number>
    failures: Record<string, number>
    dark: Record<string, number>
    skipped: Record<string, number>
  }
}

/** Terminal payload of a finished run. */
export type RunResult = {
  status: string
  rc: number
  ok: boolean
}

export type RunPhase = "idle" | "running" | "done" | "error"

export type RunOptions = {
  forks?: number
  extravars?: Record<string, string>
}

/**
 * Drives a playbook execution: opens the `run.run` event iterator over
 * `/rpc`, accumulates events, and exposes the phase/result so a component can
 * render a live console.
 */
export function useRunPlaybook() {
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [events, setEvents] = useState<RunEvent[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const start = useCallback(
    (playbookId: string, inventory: RunSelection[], options?: RunOptions) => {
      unsubscribeRef.current?.()

      setEvents([])
      setResult(null)
      setErrorMessage(null)
      setPhase("running")

      unsubscribeRef.current = consumeEventIterator(
        client.v1.run.run({ playbookId, inventory, ...options }),
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
    },
    []
  )

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
