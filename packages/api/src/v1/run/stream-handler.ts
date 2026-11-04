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
import {
  describeStreamError,
  isStreamLost,
  RUN_TIMEOUT_MS,
  toEventIterator,
  toProtoHost,
} from "#v1/run/proto"
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
 * is the ansible service refusing a run because every slot is busy; a lost
 * stream becomes `BAD_GATEWAY` with a message saying the hosts may have
 * kept going.
 *
 * `yield*` forwards oRPC's `.return()` down to `serverStream`, but it only
 * lands at the next event, so `signal` is what stops the gRPC call during a
 * silent task. A caller that left is not a lost stream: nobody is listening
 * and the run was stopped on purpose.
 */
async function* interactive<T, R>(
  iterator: AsyncGenerator<T, R, void>,
  signal?: AbortSignal
): AsyncGenerator<T, R, void> {
  try {
    return yield* iterator
  } catch (err) {
    if (signal?.aborted) throw err
    if (isGrpcError(err) && err.code === grpcStatus.RESOURCE_EXHAUSTED) {
      throw errors.TOO_MANY_REQUESTS({
        message: "Too many concurrent runs, try again in a moment",
      })
    }
    if (isStreamLost(err)) {
      throw errors.BAD_GATEWAY({ message: describeStreamError(err) })
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
    signal,
  }: {
    context: Context
    input: z.infer<typeof runInput.ping>
    signal?: AbortSignal
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
      { token, timeoutMs: RUN_TIMEOUT_MS, signal }
    )
    return yield* interactive(toEventIterator(stream), signal)
  },

  async *run({
    input,
    signal,
  }: {
    context: Context
    input: z.infer<typeof runInput.run>
    signal?: AbortSignal
  }) {
    const token = requireServiceToken()

    let bundle: Awaited<ReturnType<typeof resolveRun>>
    try {
      bundle = await resolveRun(input.playbookId, input.inventory, input)
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
        secret_variables: bundle.secretVariables,
        disabled_roles: input.disabledRoles,
      },
      { token, timeoutMs: RUN_TIMEOUT_MS, signal }
    )
    return yield* interactive(toEventIterator(stream), signal)
  },

  async *command({
    input,
    signal,
  }: {
    context: Context
    input: z.infer<typeof runInput.command>
    signal?: AbortSignal
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
      { token, timeoutMs: RUN_TIMEOUT_MS, signal }
    )
    return yield* interactive(toEventIterator(stream), signal)
  },

  async *script({
    input,
    signal,
  }: {
    context: Context
    input: z.infer<typeof runInput.script>
    signal?: AbortSignal
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
      { token, timeoutMs: RUN_TIMEOUT_MS, signal }
    )
    return yield* interactive(toEventIterator(stream), signal)
  },
}
