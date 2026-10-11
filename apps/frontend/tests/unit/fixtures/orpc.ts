import { mock } from "bun:test"
import * as realOrpc from "@/lib/orpc"

type StreamCall = (...args: unknown[]) => Promise<unknown>

const neverAnswers: StreamCall = () => new Promise(() => {})

/**
 * Stand-ins for the streaming job procedures the hooks call through
 * `client.v1.jobs.runs`. `mock.module` holds for the whole run, so the
 * oRPC module is replaced once, here, for every test file that imports this
 * fixture; each test programs the calls it needs and `resetFakeJobRuns()`
 * puts them back to a call that never answers.
 */
export const fakeJobRuns = {
  watch: mock<StreamCall>(neverAnswers),
  watchChanges: mock<StreamCall>(neverAnswers),
}

export function resetFakeJobRuns() {
  for (const call of Object.values(fakeJobRuns)) {
    call.mockReset()
    call.mockImplementation(neverAnswers)
  }
}

// Only `client.v1.jobs.runs.*` is faked; `orpc` (query keys) and `link` stay
// real for anything else that imports the module.
mock.module("@/lib/orpc", () => ({
  ...realOrpc,
  client: { v1: { jobs: { runs: fakeJobRuns } } },
}))

/**
 * An event stream a test pushes into by hand, for a long-lived subscription:
 * `stream()` is what the faked call resolves to.
 */
export function controlledStream<TEvent>() {
  const queued: IteratorResult<TEvent>[] = []
  const waiting: ((result: IteratorResult<TEvent>) => void)[] = []
  let failure: { error: unknown } | null = null
  const failWaiting: ((error: unknown) => void)[] = []

  function deliver(result: IteratorResult<TEvent>) {
    const next = waiting.shift()
    failWaiting.shift()
    if (next) next(result)
    else queued.push(result)
  }

  return {
    push(...events: TEvent[]) {
      for (const value of events) deliver({ done: false, value })
    },
    end() {
      deliver({ done: true, value: undefined })
    },
    fail(error: unknown) {
      failure = { error }
      const reject = failWaiting.shift()
      waiting.shift()
      reject?.(error)
    },
    stream(): AsyncIterator<TEvent> {
      return {
        next() {
          const ready = queued.shift()
          if (ready) return Promise.resolve(ready)
          if (failure) return Promise.reject(failure.error)
          return new Promise((resolve, reject) => {
            waiting.push(resolve)
            failWaiting.push(reject)
          })
        },
        return() {
          return Promise.resolve({ done: true, value: undefined })
        },
      }
    },
  }
}
