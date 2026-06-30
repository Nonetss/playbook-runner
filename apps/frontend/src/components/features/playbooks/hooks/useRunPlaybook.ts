import { useCallback, useRef, useState } from "react"

/** A single inventory selection forwarded to the run endpoint. */
export type RunSelection = {
  id: string
  type: "group" | "device"
}

/** Per-event payload emitted by the Ansible service over SSE. */
export type RunEvent = {
  event: string
  host: string | null
  task: string | null
  changed: boolean | null
  msg: string | null
}

/** Terminal payload of a finished run. */
export type RunResult = {
  status: string
  rc: number | null
  ok: boolean
}

export type RunPhase = "idle" | "running" | "done" | "error"

// The Ansible microservice is reached same-origin under the /ansible prefix
// (see the dev proxy in astro.config.mjs), so the session cookie is sent and
// forwarded to the backend for validation.
const RUN_URL = "/ansible/api/v0/run"

type StreamHandlers = {
  onEvent: (event: RunEvent) => void
  onDone: (result: RunResult) => void
  onError: (message: string) => void
  signal?: AbortSignal
}

function parseFrame(frame: string, handlers: StreamHandlers): void {
  let eventName: string | undefined
  const dataLines: string[] = []
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim()
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
  }
  if (dataLines.length === 0) return

  let data: unknown
  try {
    data = JSON.parse(dataLines.join("\n"))
  } catch {
    return
  }

  if (eventName === "done") {
    handlers.onDone(data as RunResult)
  } else if (eventName === "error") {
    const message =
      (data as { error?: string })?.error ?? "Error desconocido en la ejecución"
    handlers.onError(message)
  } else {
    handlers.onEvent(data as RunEvent)
  }
}

async function streamRun(
  body: { playbookId: string; inventory: RunSelection[] },
  handlers: StreamHandlers
): Promise<void> {
  const res = await fetch(RUN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    credentials: "include",
    body: JSON.stringify(body),
    signal: handlers.signal,
  })

  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`
    try {
      const payload = await res.json()
      const d = payload?.detail ?? payload?.message
      if (typeof d === "string") detail = d
      else if (d) detail = JSON.stringify(d)
    } catch {
      // keep the status-code fallback
    }
    handlers.onError(detail)
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      if (frame.trim()) parseFrame(frame, handlers)
    }
  }

  if (buffer.trim()) parseFrame(buffer, handlers)
}

/**
 * Drives a playbook execution: opens the SSE stream, accumulates events, and
 * exposes the phase/result so a component can render a live console.
 */
export function useRunPlaybook() {
  const [phase, setPhase] = useState<RunPhase>("idle")
  const [events, setEvents] = useState<RunEvent[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(
    async (playbookId: string, inventory: RunSelection[]) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setEvents([])
      setResult(null)
      setErrorMessage(null)
      setPhase("running")

      let settled = false
      try {
        await streamRun(
          { playbookId, inventory },
          {
            onEvent: (event) => setEvents((prev) => [...prev, event]),
            onDone: (res) => {
              settled = true
              setResult(res)
              setPhase("done")
            },
            onError: (message) => {
              settled = true
              setErrorMessage(message)
              setPhase("error")
            },
            signal: controller.signal,
          }
        )
        // The stream closed without a terminal frame: treat as finished.
        if (!settled && !controller.signal.aborted) setPhase("done")
      } catch (err) {
        if (controller.signal.aborted) return
        setErrorMessage(err instanceof Error ? err.message : "Error de red")
        setPhase("error")
      }
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setPhase("idle")
    setEvents([])
    setResult(null)
    setErrorMessage(null)
  }, [])

  return { phase, events, result, errorMessage, start, reset }
}
