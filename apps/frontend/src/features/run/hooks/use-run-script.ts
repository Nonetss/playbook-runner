import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/use-run-stream"
import type { RunSelection } from "@/features/run/types"
import { client } from "@/lib/orpc"

export type ScriptRequest = {
  scriptId: string
  inventory: RunSelection[]
  become: boolean
  forks?: number
}

// Module-level so `useRunStream`'s `start` keeps a stable identity.
const subscribe = (body: ScriptRequest, callbacks: RunStreamCallbacks) =>
  consumeEventIterator(client.v1.run.script(body), callbacks)

/** Drives a stored-script stream with safe cleanup and retry support. */
export function useRunScript() {
  return useRunStream(subscribe)
}
