import { env } from "@playbook-runner/env/server"
import { getClient, serverStream } from "@playbook-runner/grpc"
import { RunnerServiceClient } from "@playbook-runner/grpc/stubs"
import type { z } from "zod"
import { errors } from "#errors"
import {
  ResolveRunCredentiallessError,
  ResolveRunNotFoundError,
  ResolveRunValidationError,
  runHandler,
} from "#v1/run/handler"
import { RUN_TIMEOUT_MS, toEventIterator, toProtoHost } from "#v1/run/proto"
import type { streamInput } from "#v1/run/stream-input"

function requireServiceToken(): string {
  if (!env.SERVICE_TOKEN) {
    throw errors.SERVICE_UNAVAILABLE({
      message: "gRPC is not configured (SERVICE_TOKEN is missing)",
    })
  }
  return env.SERVICE_TOKEN
}

/** Mirrors the resolver -> HTTP status mapping ansible's `map_resolver_error` used to do. */
function toResolveError(err: unknown): never {
  if (err instanceof ResolveRunNotFoundError) {
    throw errors.NOT_FOUND({ message: err.message })
  }
  if (err instanceof ResolveRunValidationError) {
    throw errors.BAD_REQUEST({ message: err.message })
  }
  if (err instanceof ResolveRunCredentiallessError) {
    throw errors.PRECONDITION_FAILED({ message: err.message })
  }
  throw err
}

/**
 * Resolves a playbook/inventory/script/device against the database (via
 * `runHandler`, the same functions the job scheduler uses in
 * `#jobs/executor`), then streams its execution from the ansible service
 * over the `RunnerService` gRPC RPCs as a plain async generator — the shape
 * `#v1/run/router.ts`'s `eventIterator` procedures need. oRPC's own RPC
 * transport takes care of getting this to the browser; no SSE framing here.
 */
export const streamHandler = {
  async *ping(input: z.infer<typeof streamInput.ping>) {
    const token = requireServiceToken()

    let host: Awaited<ReturnType<typeof runHandler.resolveDevice>>
    try {
      host = await runHandler.resolveDevice(input.deviceId)
    } catch (err) {
      toResolveError(err)
    }

    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    const stream = serverStream(
      client.runPing.bind(client),
      { host: toProtoHost(host) },
      { token, timeoutMs: RUN_TIMEOUT_MS }
    )
    return yield* toEventIterator(stream)
  },

  async *run(input: z.infer<typeof streamInput.run>) {
    const token = requireServiceToken()

    let bundle: Awaited<ReturnType<typeof runHandler.resolveRun>>
    try {
      bundle = await runHandler.resolveRun(input.playbookId, input.inventory)
    } catch (err) {
      toResolveError(err)
    }

    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    const stream = serverStream(
      client.runBundle.bind(client),
      {
        playbook: bundle.playbook,
        hosts: bundle.hosts.map(toProtoHost),
        forks: input.forks,
        extravars: input.extravars,
      },
      { token, timeoutMs: RUN_TIMEOUT_MS }
    )
    return yield* toEventIterator(stream)
  },

  async *command(input: z.infer<typeof streamInput.command>) {
    const token = requireServiceToken()

    let hosts: Awaited<ReturnType<typeof runHandler.resolveHosts>>
    try {
      hosts = await runHandler.resolveHosts(input.inventory)
    } catch (err) {
      toResolveError(err)
    }

    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    const stream = serverStream(
      client.runCommand.bind(client),
      {
        hosts: hosts.map(toProtoHost),
        module: input.module,
        command: input.command,
        become: input.become,
        forks: input.forks,
      },
      { token, timeoutMs: RUN_TIMEOUT_MS }
    )
    return yield* toEventIterator(stream)
  },

  async *script(input: z.infer<typeof streamInput.script>) {
    const token = requireServiceToken()

    let bundle: Awaited<ReturnType<typeof runHandler.resolveScript>>
    try {
      bundle = await runHandler.resolveScript(input.scriptId, input.inventory)
    } catch (err) {
      toResolveError(err)
    }

    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    const stream = serverStream(
      client.runScript.bind(client),
      {
        script: bundle.script,
        hosts: bundle.hosts.map(toProtoHost),
        become: input.become,
        forks: input.forks,
      },
      { token, timeoutMs: RUN_TIMEOUT_MS }
    )
    return yield* toEventIterator(stream)
  },
}
