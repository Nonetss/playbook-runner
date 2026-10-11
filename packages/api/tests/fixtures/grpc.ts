import { mock } from "bun:test"
import type {
  ServerStreamOptions,
  UnaryOptions,
} from "@playbook-runner/grpc/client"

/** A `ServiceError`-shaped error that `isGrpcError` recognizes. */
export function grpcError(code: number, details = ""): Error {
  return Object.assign(new Error(`gRPC status ${code}`), { code, details })
}

/** An async stream of `events`, then `failure` if one is given. */
export async function* streamOf<TEvent>(
  events: TEvent[],
  failure?: unknown
): AsyncGenerator<TEvent> {
  for (const event of events) yield event
  if (failure !== undefined) throw failure
}

/**
 * Generated client methods are only ever `.bind(client)`-ed and handed to
 * `unary`/`serverStream`, so every property is an inert function.
 */
const stubClient = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new Error("fake grpc: client methods are never called directly")
      }
    },
  }
)

function notProgrammed(name: string) {
  return () => {
    throw new Error(`fake grpc: "${name}" has no implementation`)
  }
}

type UnaryFn = (
  call: unknown,
  request: unknown,
  options: UnaryOptions
) => Promise<unknown>

type ServerStreamFn = (
  call: unknown,
  request: unknown,
  options: ServerStreamOptions
) => AsyncIterable<unknown>

/**
 * The client calls the handlers make, installed by `tests/setup.ts` in place
 * of `@playbook-runner/grpc`'s. Each throws until a test programs it; call
 * `resetGrpc()` in `beforeEach`.
 */
export const grpc = {
  unary: mock<UnaryFn>(notProgrammed("unary")),
  serverStream: mock<ServerStreamFn>(notProgrammed("serverStream")),
}

export const getClient = () => stubClient

export function resetGrpc() {
  grpc.unary.mockReset()
  grpc.unary.mockImplementation(notProgrammed("unary"))
  grpc.serverStream.mockReset()
  grpc.serverStream.mockImplementation(notProgrammed("serverStream"))
}

/**
 * A stream the test feeds by hand, for runs that must stay open across
 * assertions. It ends on `end()` and throws on `fail()`. `cancelled` turns
 * true when the consumer stops reading before the stream ended, which is
 * where the real `serverStream` cancels the gRPC call.
 */
export function controlledStream<TEvent>() {
  const pending: TEvent[] = []
  const state: {
    wake: (() => void) | undefined
    closed: boolean
    failure: unknown
    cancelled: boolean
  } = { wake: undefined, closed: false, failure: undefined, cancelled: false }

  function notify() {
    const wake = state.wake
    state.wake = undefined
    wake?.()
  }

  async function* stream(): AsyncGenerator<TEvent> {
    let finished = false
    try {
      for (;;) {
        const next = pending.shift()
        if (next !== undefined) {
          yield next
          continue
        }
        if (state.failure !== undefined) {
          finished = true
          throw state.failure
        }
        if (state.closed) {
          finished = true
          return
        }
        await new Promise<void>((resolve) => {
          state.wake = resolve
        })
      }
    } finally {
      if (!finished) state.cancelled = true
    }
  }

  return {
    stream,
    get cancelled() {
      return state.cancelled
    },
    push(...events: TEvent[]) {
      pending.push(...events)
      notify()
    },
    end() {
      state.closed = true
      notify()
    },
    fail(failure: unknown) {
      state.failure = failure
      notify()
    },
  }
}

/** Lets detached work (a job run's background completion) catch up. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
