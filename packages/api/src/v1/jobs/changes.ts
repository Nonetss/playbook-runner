import { type RunChange, subscribeRunChanges } from "#v1/jobs/events"

export type RunChangeEvent =
  | { type: "subscribed" }
  | ({ type: "changed" } & RunChange)

/**
 * Every job run start and finish until `signal` aborts, opened by a
 * `subscribed` event so a client can tell a live connection from a silent
 * one. The listener is registered before `subscribed` is yielded, so any
 * change after it reaches the caller. Aborting `signal` ends the stream at
 * once and normally, not as a failure.
 */
export async function* followRunChanges(
  signal?: AbortSignal
): AsyncGenerator<RunChangeEvent, void, void> {
  if (signal?.aborted) return
  const live = subscribeRunChanges(signal)
  try {
    yield { type: "subscribed" }
    for await (const change of live) yield { type: "changed", ...change }
  } catch (error) {
    // The subscription throws the abort reason: a caller that left ends its
    // stream normally.
    if (signal?.aborted) return
    throw error
  } finally {
    await live.return()
  }
}
