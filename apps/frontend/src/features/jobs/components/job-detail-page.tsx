import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Clock, Loader2, Pencil, Play, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JobRunOutput } from "@/features/jobs/components/job-run-output"
import {
  RunHostSummary,
  RunStatusBadge,
} from "@/features/jobs/components/run-widgets"
import {
  useJobGet,
  useJobRun,
  useJobRunsList,
  useJobRunWatch,
} from "@/features/jobs/hooks/useJobs"
import type { JobRun } from "@/features/jobs/types"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(run: JobRun): string {
  if (!run.startedAt) return "—"
  const start = new Date(run.startedAt).getTime()
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()
  const secs = Math.max(0, Math.round((end - start) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

function JobDetailPageInner({ id }: { id: string }) {
  const { t } = useTranslation("jobs")
  const queryClient = useQueryClient()
  const { data: job, isPending: jobLoading, isError } = useJobGet(id)
  const runJob = useJobRun()
  const watch = useJobRunWatch()

  const { data: runs = [], isPending: runsLoading } = useJobRunsList(id, {
    // Poll while anything is running so the status flips without a refresh.
    live: true,
  })

  // Pre-select the run referenced in `?run=...` so the history feed and
  // dashboard activity panel can deep-link straight to a run. Cleared once
  // consumed so subsequent clicks inside this page follow the newest-run
  // default again.
  const initialRunId = useMemo(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("run")
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(initialRunId)

  // Default selection: keep the newest run focused as the list updates,
  // unless the user explicitly clicked a run already (`?run=...`), chose
  // a different one in the side list, or just triggered a run whose row
  // has not landed in the polled list yet.
  useEffect(() => {
    if (runs.length === 0) {
      if (!selectedId) setSelectedId(null)
      return
    }
    if (!selectedId) {
      setSelectedId(runs[0].id)
      return
    }
    // Hold onto a just-triggered run id even before the list reflects it —
    // otherwise we'd snap back to the previous newest run and "Ejecutar
    // ahora" would appear to do nothing.
    if (
      !runs.some((r) => r.id === selectedId) &&
      watch.watchingRunId !== selectedId
    ) {
      setSelectedId(runs[0].id)
    }
  }, [runs, selectedId, watch.watchingRunId])

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? null,
    [runs, selectedId]
  )

  // Whenever the currently-selected run shows as `running` in the polled
  // list — whether it's cron-triggered, started from another tab, or just
  // hasn't been picked up by `watch` yet — attach to its live events. This
  // is what makes *any* in-progress run watchable, not just the one this
  // page happened to trigger itself.
  useEffect(() => {
    if (selectedRun?.status !== "running") return
    if (watch.watchingRunId === selectedRun.id) return
    watch.start(selectedRun.id)
  }, [selectedRun?.id, selectedRun?.status, watch.watchingRunId, watch.start])

  // Once a watched run settles, its row is already persisted — refresh the
  // (already-polling) runs list so history/badges catch up immediately
  // instead of waiting for the next 3s tick.
  useEffect(() => {
    if (watch.phase !== "done" && watch.phase !== "error") return
    queryClient.invalidateQueries({
      queryKey: orpc.jobs.runs.list.queryKey({ input: { jobId: id } }),
    })
  }, [watch.phase, queryClient, id])

  function focusRun(runId: string) {
    setSelectedId(runId)
    const url = new URL(window.location.href)
    url.searchParams.set("run", runId)
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}`
    )
  }

  async function handleRunNow() {
    const { runId } = await runJob.mutateAsync({ id })
    if (runId) {
      focusRun(runId)
      watch.start(runId)
    }
  }

  function handleSelectRun(runId: string) {
    if (watch.watchingRunId !== runId) watch.reset()
    focusRun(runId)
  }

  // Only treat the live view as authoritative for the run currently
  // selected — clicking a different (finished) history row falls back to
  // its persisted `eventsJson` instead of stale live state.
  const isWatchingSelected =
    watch.watchingRunId !== null &&
    watch.watchingRunId === selectedId &&
    watch.phase !== "idle"

  if (jobLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("detail.loading")}
        </div>
      </main>
    )
  }

  if (isError || !job) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("detail.load_error")}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/jobs">
            <ArrowLeft className="size-4" />
            {t("detail.back_to_jobs")}
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            aria-label={t("detail.back_aria")}
          >
            <a href="/jobs">
              <ArrowLeft className="size-4" />
            </a>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {job.name}
            </h1>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-sm">
              {job.cronExpression ? (
                <Badge variant="secondary" className="gap-1 font-mono text-xs">
                  <Clock className="size-3" />
                  {job.cronExpression}
                </Badge>
              ) : (
                <span>{t("detail.manual_execution")}</span>
              )}
              {!job.enabled ? (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  {t("detail.disabled")}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <a href={`/jobs/${job.id}/edit`}>
              <Pencil className="size-4" />
              {t("detail.edit")}
            </a>
          </Button>
          <Button
            onClick={handleRunNow}
            disabled={
              runJob.isPending || watch.phase === "running" || !job.playbookId
            }
            className="flex-1 sm:flex-none"
          >
            {runJob.isPending || watch.phase === "running" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {t("detail.run_now")}
          </Button>
        </div>
      </div>

      {/* Body: history + output */}
      <div className="grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr]">
        {/* History list */}
        <section className="space-y-3 md:max-h-[calc(100vh-12rem)] md:overflow-y-auto md:pr-1">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t("detail.history")}
          </h2>

          {runsLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("detail.loading_short")}
            </div>
          ) : runs.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">
                {t("detail.empty_runs_prefix")}{" "}
                <span className="font-medium">{t("detail.run_now")}</span>{" "}
                {t("detail.empty_runs_suffix")}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => {
                const active = run.id === selectedId
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRun(run.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-accent"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <RunStatusBadge
                          status={run.status}
                          hostsOk={run.hostsOk}
                          hostsFailed={run.hostsFailed}
                        />
                        <span className="text-muted-foreground text-xs">
                          {run.trigger === "schedule"
                            ? t("detail.trigger_schedule")
                            : t("detail.trigger_manual")}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
                        <span className="truncate">
                          {formatDateTime(run.startedAt ?? run.createdAt)}
                        </span>
                        <RunHostSummary
                          hostsOk={run.hostsOk}
                          hostsFailed={run.hostsFailed}
                        />
                        <span className="font-mono shrink-0">
                          {formatDuration(run)}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Selected run output (or the live-streaming run just triggered) */}
        <section className="space-y-3 md:min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              {t("detail.output")}
            </h2>
            {isWatchingSelected ? (
              <RunStatusBadge
                status={
                  watch.phase === "running"
                    ? "running"
                    : (watch.result?.status ?? "failed")
                }
              />
            ) : selectedRun ? (
              <div className="flex items-center gap-2">
                <RunHostSummary
                  hostsOk={selectedRun.hostsOk}
                  hostsFailed={selectedRun.hostsFailed}
                />
                <RunStatusBadge
                  status={selectedRun.status}
                  hostsOk={selectedRun.hostsOk}
                  hostsFailed={selectedRun.hostsFailed}
                />
              </div>
            ) : null}
          </div>

          {isWatchingSelected ? (
            <>
              {watch.errorMessage ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span className="wrap-break-word">{watch.errorMessage}</span>
                </div>
              ) : null}
              <JobRunOutput
                events={watch.events}
                running={watch.phase === "running"}
              />
            </>
          ) : selectedRun ? (
            <>
              {selectedRun.error ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span className="wrap-break-word">{selectedRun.error}</span>
                </div>
              ) : null}
              <JobRunOutput
                events={selectedRun.eventsJson ?? []}
                running={selectedRun.status === "running"}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {t("detail.select_run")}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function JobNotFound() {
  const { t } = useTranslation("jobs")
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">{t("detail.not_found")}</p>
    </main>
  )
}

export function JobDetailPage({
  id,
  locale,
}: {
  id?: string
  locale?: string
}) {
  return (
    <AppProviders initialLocale={locale}>
      {id ? <JobDetailPageInner id={id} /> : <JobNotFound />}
    </AppProviders>
  )
}
