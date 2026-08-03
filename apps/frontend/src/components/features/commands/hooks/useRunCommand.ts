import { consumeEventIterator } from "@orpc/client"
import { useCallback, useRef, useState } from "react"
import type {
  RunEvent,
  RunPhase,
  RunResult,
  RunSelection,
} from "@/components/features/playbooks/hooks/useRunPlaybook"
import { client } from "@/lib/orpc"

export type CommandModule = "shell" | "command"

export type CommandRequest = {
  inventory: RunSelection[]
  command: string
  module: CommandModule
  become: boolean
  forks?: number
}

/**
 * Drives an ad-hoc command execution against the resolved inventory: opens
 * the `run.command` event iterator over `/rpc`, accumulates events, and
 * exposes phase/result so the commands page can render a live console.
 *
 * Re-exports the event/result types from `useRunPlaybook` because the
 * contract is shared; only the request body differs.
 */
export function useRunCommand() {
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [events, setEvents] = useState<RunEvent[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const start = useCallback((body: CommandRequest) => {
    unsubscribeRef.current?.()

    setEvents([])
    setResult(null)
    setErrorMessage(null)
    setPhase("running")

    unsubscribeRef.current = consumeEventIterator(client.v1.run.command(body), {
      onEvent: (event) => setEvents((prev) => [...prev, event as RunEvent]),
      onSuccess: (value) => {
        if (value) setResult(value)
        setPhase("done")
      },
      onError: (err) => {
        setErrorMessage(err instanceof Error ? err.message : "Error de red")
        setPhase("error")
      },
    })
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
