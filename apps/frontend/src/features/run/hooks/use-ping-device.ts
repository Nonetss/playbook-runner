import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/use-run-stream"
import { client } from "@/lib/orpc"

export type { RunEvent, RunResult } from "@/features/run/types"

// Module-level so `useRunStream`'s `start` keeps a stable identity.
const subscribe = (deviceId: string, callbacks: RunStreamCallbacks) =>
  consumeEventIterator(client.v1.run.ping({ deviceId }), callbacks)

/** Drives a device ping with safe cleanup and retry support. */
export function usePingDevice() {
  return useRunStream(subscribe)
}
