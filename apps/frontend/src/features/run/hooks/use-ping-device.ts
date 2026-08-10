import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/useRunStream"
import { client } from "@/lib/orpc"

export type { RunEvent, RunResult } from "@/features/run/types"

/** Drives a device ping with safe cleanup and retry support. */
export function usePingDevice() {
  const subscribe = (deviceId: string, callbacks: RunStreamCallbacks) =>
    consumeEventIterator(client.v1.run.ping({ deviceId }), callbacks)

  return useRunStream(subscribe)
}
