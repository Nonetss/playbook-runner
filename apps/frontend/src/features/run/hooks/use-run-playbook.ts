import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/use-run-stream"
import type { ExtraVars } from "@/features/run/lib/run-variables"
import type { RunOptions, RunSelection } from "@/features/run/types"
import { client } from "@/lib/orpc"

/**
 * Drives a playbook execution and keeps stream lifecycle, retry, and
 * stop-watching behavior consistent with the other run surfaces.
 */
// Module-level so `useRunStream`'s `start` keeps a stable identity.
const subscribe = (
  request: {
    playbookId: string
    inventory: RunSelection[]
    forks?: number
    extravars?: ExtraVars
    infisicalConnectionId?: string
    infisicalEnvironment?: string
    secretVariables?: RunOptions["secretVariables"]
    disabledRoles?: RunOptions["disabledRoles"]
  },
  callbacks: RunStreamCallbacks
) => consumeEventIterator(client.v1.run.run(request), callbacks)

export function useRunPlaybook() {
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
