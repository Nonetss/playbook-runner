import { consumeEventIterator } from "@orpc/client"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/use-run-stream"
import type { RunSelection } from "@/features/run/types"
import { client } from "@/lib/orpc"

export type CommandModule = "shell" | "command"

export type CommandRequest = {
  inventory: RunSelection[]
  command: string
  module: CommandModule
  become: boolean
  forks?: number
}

/** Drives an ad-hoc command stream with safe cleanup and retry support. */
export function useRunCommand() {
  const subscribe = (body: CommandRequest, callbacks: RunStreamCallbacks) =>
    consumeEventIterator(client.v1.run.command(body), callbacks)

  return useRunStream(subscribe)
}
