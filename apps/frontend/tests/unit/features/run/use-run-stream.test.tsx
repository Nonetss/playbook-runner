import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import {
  type RunStreamCallbacks,
  useRunStream,
} from "@/features/run/hooks/use-run-stream"

function setup() {
  let callbacks: RunStreamCallbacks | undefined
  let closed = 0
  const subscribe = (_request: string, cb: RunStreamCallbacks) => {
    callbacks = cb
    return () => {
      closed += 1
    }
  }
  const view = renderHook(() => useRunStream(subscribe))
  act(() => view.result.current.start("run"))
  return {
    ...view,
    finish: () =>
      act(() =>
        callbacks?.onSuccess({ status: "successful", rc: 0, ok: true })
      ),
    closed: () => closed,
  }
}

afterEach(cleanup)

describe("useRunStream stopWatching", () => {
  test("closes a running stream", () => {
    const { result, closed } = setup()

    act(() => result.current.stopWatching())

    expect(result.current.phase).toBe("cancelled")
    expect(closed()).toBe(1)
  })

  test("a run that finished during a confirmation keeps its result", () => {
    const { result, finish } = setup()
    const heldDuringConfirmation = result.current.stopWatching

    finish()
    act(() => heldDuringConfirmation())

    expect(result.current.phase).toBe("done")
    expect(result.current.result).toMatchObject({ ok: true })
  })
})
