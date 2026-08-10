import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/useRunStream"
import type { RunOptions, RunSelection } from "@/features/run/types"
import { client } from "@/lib/orpc"

/**
 * Drives a playbook execution and keeps stream lifecycle, retry, and
 * stop-watching behavior consistent with the other run surfaces.
 */
export function useRunPlaybook() {
  const subscribe = (
    request: {
      playbookId: string
      inventory: RunSelection[]
      forks?: number
      extravars?: Record<string, string>
    },
    callbacks: RunStreamCallbacks
  ) => consumeEventIterator(client.v1.run.run(request), callbacks)

  const stream = useRunStream(subscribe)

  return {
    ...stream,
    start: (
      playbookId: string,
      inventory: RunSelection[],
      options?: RunOptions
    ) => stream.start({ playbookId, inventory, ...options }),
  }
}
