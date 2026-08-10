import { useQueryClient } from "@tanstack/react-query"
import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const ArrowLeft = getIcon("navigation", "back")
const BriefcaseIcon = getIcon("resources", "briefcase")
const CheckCircle2 = getIcon("status", "success")
const Clock = getIcon("scheduling", "time")
const Loader2 = getIcon("status", "loading")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const XCircle = getIcon("status", "error")

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import { useConfirm } from "@/hooks/useConfirm"
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
  const confirm = useConfirm()

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
    if (!job) return
    const confirmed = await confirm({
      title: t("run_now.confirm_title", { name: job.name }),
      description: t("run_now.confirm_description", {
        targets: job.inventoryJson?.length ?? 0,
        forks: job.forks,
      }),
      confirmLabel: t("run_now.confirm"),
      cancelLabel: t("run_now.cancel"),
    })
    if (!confirmed) return

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
      <main className="flex h-[calc(100dvh-var(--navbar-height))] w-full flex-1 items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {t("detail.loading")}
        </div>
      </main>
    )
  }

  if (isError || !job) {
    return (
      <main className="flex h-[calc(100dvh-var(--navbar-height))] w-full flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("detail.load_error")}
        </div>
        <Button asChild variant="outline">
          <a href="/jobs/scheduler">
            <ArrowLeft className="size-4" />
            {t("detail.back_to_jobs")}
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="flex h-[calc(100dvh-var(--navbar-height))] w-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-6">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 sm:size-8"
          aria-label={t("detail.back_aria")}
        >
          <a href="/jobs/scheduler">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
          <BriefcaseIcon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold leading-tight">
            {job.name}
          </h1>
          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-xs">
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
        <div className="flex w-full shrink-0 gap-2 sm:ml-auto sm:w-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-10 flex-1 sm:min-h-8 sm:flex-none"
          >
            <a href={`/jobs/${job.id}/edit`}>
              <Pencil className="size-4" />
              {t("detail.edit")}
            </a>
          </Button>
          <Button
            size="sm"
            className="min-h-10 flex-1 sm:min-h-8 sm:flex-none"
            onClick={handleRunNow}
            disabled={
              runJob.isPending || watch.phase === "running" || !job.playbookId
            }
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

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* ── Terminal ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-950">
          {/* Faux terminal title bar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3 py-2 sm:px-4">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-500/80" />
              <span className="size-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <span className="ml-2 truncate font-mono type-console-meta text-zinc-500">
              <span className="text-zinc-600">job</span>
              <span className="mx-1.5 text-zinc-700">$</span>
              <span className="text-zinc-400">{job.name}</span>
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {isWatchingSelected ? (
              <PlaybookRunConsole
                events={watch.events}
                running={watch.phase === "running"}
              />
            ) : selectedRun ? (
              <PlaybookRunConsole
                events={selectedRun.eventsJson ?? []}
                running={selectedRun.status === "running"}
              />
            ) : (
              <p className="select-none text-sm text-zinc-600">
                {t("detail.select_run")}
              </p>
            )}
          </div>

          {/* Error / result banners */}
          <RunStreamStatus
            phase={watch.phase}
            errorMessage={watch.errorMessage}
            onStopWatching={watch.stopWatching}
            variant="terminal"
            labels={{
              connecting: t("detail.connecting"),
              stopWatching: t("detail.stop_watching"),
              stoppedWatching: t("detail.stopped_watching"),
              serverMayStillBeRunning: t("detail.server_may_still_be_running"),
              connectionError: t("detail.connection_error"),
            }}
          />

          {isWatchingSelected && watch.phase === "done" && watch.result ? (
            <div
              className={cn(
                "mx-3 mb-3 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:mx-5 sm:mb-4",
                watch.result.ok
                  ? "border-emerald-900/50 bg-emerald-950/40 text-emerald-400"
                  : "border-amber-900/50 bg-amber-950/40 text-amber-400"
              )}
            >
              {watch.result.ok ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="size-3.5 shrink-0" />
              )}
              <span>
                {t("detail.result_finished_with_status", {
                  status: watch.result.status,
                })}
              </span>
            </div>
          ) : null}

          {!isWatchingSelected && selectedRun?.error ? (
            <div className="mx-3 mb-3 flex shrink-0 items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-400 sm:mx-5 sm:mb-4">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="wrap-break-word">{selectedRun.error}</span>
            </div>
          ) : null}
        </div>

        {/* ── History sidebar ── */}
        <div className="flex h-[38%] min-h-40 max-h-64 shrink-0 flex-col gap-2 overflow-y-auto border-t p-3 sm:gap-3 sm:p-4 lg:h-auto lg:min-h-0 lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l">
          <p className="text-muted-foreground type-label">
            {t("detail.history")}
          </p>

          {runsLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" />
              {t("detail.loading_short")}
            </div>
          ) : runs.length === 0 ? (
            <p className="text-muted-foreground px-2 text-xs">
              {t("detail.empty_runs_prefix")}{" "}
              <span className="font-medium">{t("detail.run_now")}</span>{" "}
              {t("detail.empty_runs_suffix")}
            </p>
          ) : (
            <ul className="space-y-1 lg:space-y-0.5">
              {runs.map((run) => {
                const active = run.id === selectedId
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRun(run.id)}
                      className={cn(
                        "min-h-11 w-full rounded-md px-2 py-2.5 text-left text-sm transition-colors lg:min-h-0 lg:py-1.5",
                        active ? "bg-accent" : "hover:bg-accent/50"
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
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs">
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
        </div>
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
