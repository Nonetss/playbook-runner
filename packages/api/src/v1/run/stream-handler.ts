import { env } from "@playbook-runner/env/server"
import {
  getClient,
  grpcStatus,
  isGrpcError,
  serverStream,
} from "@playbook-runner/grpc"
import { RunnerServiceClient } from "@playbook-runner/grpc/stubs"
import type { z } from "zod"
import type { Context } from "#context"
import { errors } from "#errors"
import type { runInput } from "#v1/run/input"
import { RUN_TIMEOUT_MS, toEventIterator, toProtoHost } from "#v1/run/proto"
import {
  ResolveRunCredentiallessError,
  ResolveRunNotFoundError,
  ResolveRunPreconditionError,
  ResolveRunValidationError,
  resolveDevice,
  resolveHosts,
  resolveRun,
  resolveScript,
} from "#v1/run/resolve"

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
  if (
    err instanceof ResolveRunCredentiallessError ||
    err instanceof ResolveRunPreconditionError
  ) {
    throw errors.PRECONDITION_FAILED({ message: err.message })
  }
  throw err
}

/**
 * Maps gRPC failures the user can act on to API errors. `RESOURCE_EXHAUSTED`
 * is the ansible service refusing a run because every slot is busy.
 *
 * `yield*` forwards oRPC's `.return()` (client disconnected) down to
 * `serverStream`, which cancels the gRPC call and so stops the run.
 */
async function* interactive<T, R>(
  iterator: AsyncGenerator<T, R, void>
): AsyncGenerator<T, R, void> {
  try {
    return yield* iterator
  } catch (err) {
    if (isGrpcError(err) && err.code === grpcStatus.RESOURCE_EXHAUSTED) {
      throw errors.TOO_MANY_REQUESTS({
        message: "Too many concurrent runs, try again in a moment",
      })
    }
    throw err
  }
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
  async *ping({
    input,
  }: {
    context: Context
    input: z.infer<typeof runInput.ping>
  }) {
    const token = requireServiceToken()

    let host: Awaited<ReturnType<typeof resolveDevice>>
    try {
      host = await resolveDevice(input.deviceId)
    } catch (err) {
      toResolveError(err)
    }

    const client = getClient(RunnerServiceClient, env.ANSIBLE_GRPC_TARGET)
    const stream = serverStream(
      client.runPing.bind(client),
      { host: toProtoHost(host) },
      { token, timeoutMs: RUN_TIMEOUT_MS }
    )
    return yield* interactive(toEventIterator(stream))
  },

  async *run({
    input,
  }: {
    context: Context
    input: z.infer<typeof runInput.run>
  }) {
    const token = requireServiceToken()

    let bundle: Awaited<ReturnType<typeof resolveRun>>
    try {
      bundle = await resolveRun(input.playbookId, input.inventory)
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
    return yield* interactive(toEventIterator(stream))
  },

  async *command({
    input,
  }: {
    context: Context
    input: z.infer<typeof runInput.command>
  }) {
    const token = requireServiceToken()

    let hosts: Awaited<ReturnType<typeof resolveHosts>>
    try {
      hosts = await resolveHosts(input.inventory)
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
    return yield* interactive(toEventIterator(stream))
  },

  async *script({
    input,
  }: {
    context: Context
    input: z.infer<typeof runInput.script>
  }) {
    const token = requireServiceToken()

    let bundle: Awaited<ReturnType<typeof resolveScript>>
    try {
      bundle = await resolveScript(input.scriptId, input.inventory)
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
    return yield* interactive(toEventIterator(stream))
  },
}
