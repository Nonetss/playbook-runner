import type { JobRunChange } from "@/features/jobs/types"

type RunChangeListener = (change: JobRunChange) => void

/**
 * In-page fan-out of the run changes the navbar's `jobs.runs.watchChanges`
 * subscription receives, so a page can react to them (e.g. follow a new
 * run) without opening a stream of its own. Islands share module instances,
 * like the QueryClient singleton, so every island hears the same bus.
 */
const listeners = new Set<RunChangeListener>()

export function emitRunChange(change: JobRunChange): void {
  for (const listener of [...listeners]) listener(change)
}

/** Listens to run changes until the returned function is called. */
export function onRunChange(listener: RunChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Whether a job's detail page should move its selection to a run that just
 * changed: only a run of this job that starts while the page shows nothing,
 * the job's newest run, or that very run — an older run the user picked to
 * review stays put.
 */
export function shouldFollowNewRun({
  pageJobId,
  change,
  selectedId,
  newestRunId,
}: {
  pageJobId: string
  change: JobRunChange
  selectedId: string | null
  newestRunId: string | null
}): boolean {
  if (change.status !== "running" || change.jobId !== pageJobId) return false
  return (
    selectedId === null ||
    selectedId === newestRunId ||
    selectedId === change.runId
  )
}
