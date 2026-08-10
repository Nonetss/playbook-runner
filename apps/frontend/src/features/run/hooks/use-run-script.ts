import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/useRunStream"
import type { RunSelection } from "@/features/run/types"
import { client } from "@/lib/orpc"

export type ScriptRequest = {
  scriptId: string
  inventory: RunSelection[]
  become: boolean
  forks?: number
}

/** Drives a stored-script stream with safe cleanup and retry support. */
export function useRunScript() {
  const subscribe = (body: ScriptRequest, callbacks: RunStreamCallbacks) =>
    consumeEventIterator(client.v1.run.script(body), callbacks)

  return useRunStream(subscribe)
}
