import { useQueryClient } from "@tanstack/react-query"
import { getIcon } from "@/lib/icon-registry"

const ChevronLeft = getIcon("navigation", "previous")
const ChevronRight = getIcon("navigation", "next")
const Clock = getIcon("scheduling", "time")
const Loader2 = getIcon("status", "loading")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")

import type * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { StateCard } from "@/components/shared/feedback/state-card"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import {
  RunHostSummary,
  RunStatusTag,
} from "@/features/jobs/components/run-widgets"
import {
  useJobGet,
  useJobRun,
  useJobRunGet,
  useJobRunsList,
  useJobRunWatch,
} from "@/features/jobs/hooks/use-jobs"
import type { JobRun } from "@/features/jobs/types"
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { RunResultBanner } from "@/features/run/components/run-result-banner"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  TerminalBanner,
  TerminalFrame,
  TerminalPanelSection,
} from "@/features/run/components/terminal-frame"
import { useConfirm } from "@/hooks/use-confirm"
import { formatDateTime } from "@/lib/format"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

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
  const { t, i18n } = useTranslation("jobs")
  const queryClient = useQueryClient()
  const { data: job, isPending: jobLoading, isError } = useJobGet(id)
  const runJob = useJobRun()
  const watch = useJobRunWatch()
  const confirm = useConfirm()

  const [page, setPage] = useState(0)
  const {
    data: runsPage,
    isPending: runsLoading,
    isPlaceholderData: runsPageChanging,
  } = useJobRunsList(id, page, {
    // Poll while anything is running so the status flips without a refresh.
    live: true,
  })
  const runs = runsPage?.runs ?? []
  const hasNextPage = runsPage?.hasNext ?? false

  // Pre-select the run referenced in `?run=...` so the history feed and
  // dashboard activity panel can deep-link straight to a run.
  const initialRunId = useMemo(() => {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("run")
  }, [])

  const [selectedId, setSelectedId] = useState<string | null>(initialRunId)

  // The selected run may live on another page (a deep link to an old run,
  // or the user paged away after picking one), or be a just-triggered run
  // whose row has not landed in the polled list yet: fetch it on its own.
  const listedRun = runs.find((r) => r.id === selectedId) ?? null
  const { data: fetchedRun, isError: selectedRunMissing } = useJobRunGet(
    selectedId,
    { enabled: !runsLoading && !listedRun }
  )
  const selectedRun =
    listedRun ?? (fetchedRun?.id === selectedId ? fetchedRun : null)

  // Default selection: focus the newest run when nothing is selected yet.
  useEffect(() => {
    if (selectedId || page !== 0) return
    const newest = runs[0]
    if (newest) setSelectedId(newest.id)
  }, [runs, selectedId, page])

  // A `?run=...` that does not exist (deleted, malformed) falls back to the
  // newest-run default.
  useEffect(() => {
    if (!selectedRunMissing || listedRun) return
    if (watch.watchingRunId === selectedId) return
    setSelectedId(null)
    setPage(0)
  }, [selectedRunMissing, listedRun, selectedId, watch.watchingRunId])

  // A page emptied under us (runs deleted) steps back to the first one.
  useEffect(() => {
    if (page > 0 && !runsLoading && !runsPageChanging && runs.length === 0) {
      setPage(0)
    }
  }, [page, runsLoading, runsPageChanging, runs.length])

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
    if (watch.watchingRunId) {
      queryClient.invalidateQueries({
        queryKey: orpc.jobs.runs.get.queryKey({
          input: { id: watch.watchingRunId },
        }),
      })
    }
  }, [watch.phase, watch.watchingRunId, queryClient, id])

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

    let runId: string | null
    try {
      ;({ runId } = await runJob.mutateAsync({ id }))
    } catch {
      return // useJobRun already showed the error toast (e.g. already running).
    }
    if (runId) {
      setPage(0)
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

  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref="/jobs/scheduler"
      backLabel={t("detail.back_to_jobs")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (jobLoading)
    return frame(<StateCard spinner title={t("detail.loading")} />)
  if (isError || !job) {
    return frame(
      <StateCard tone="destructive" title={t("detail.load_error")} />
    )
  }

  const running = runJob.isPending || watch.phase === "running"

  return frame(
    <>
      <PageHero
        surface="scheduler"
        title={job.name}
        description={
          job.cronExpression ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              <Text variant="data">{job.cronExpression}</Text>
            </span>
          ) : (
            t("detail.manual_execution")
          )
        }
        status={
          job.enabled ? undefined : (
            <StatusTag dotTone="border">{t("detail.disabled")}</StatusTag>
          )
        }
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <AppLink href={`/jobs/${job.id}/edit`}>
                <Pencil className="size-4" />
                {t("detail.edit")}
              </AppLink>
            </Button>
            <Button
              onClick={handleRunNow}
              disabled={running || !job.playbookId}
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {t("detail.run_now")}
            </Button>
          </div>
        }
      />

      <TerminalFrame
        context="job"
        command={job.name}
        banners={
          <>
            <RunStreamStatus
              phase={watch.phase}
              errorMessage={watch.errorMessage}
              onStopWatching={watch.stopWatching}
              variant="terminal"
              labels={{
                connecting: t("detail.connecting"),
                stopWatching: t("detail.stop_watching"),
                stoppedWatching: t("detail.stopped_watching"),
                serverMayStillBeRunning: t(
                  "detail.server_may_still_be_running"
                ),
                connectionError: t("detail.connection_error"),
              }}
            />
            {isWatchingSelected && watch.phase === "done" && watch.result ? (
              <RunResultBanner
                result={watch.result}
                message={t("detail.result_finished_with_status", {
                  status: watch.result.status,
                })}
              />
            ) : null}
            {!isWatchingSelected && selectedRun?.error ? (
              <TerminalBanner tone="failed">{selectedRun.error}</TerminalBanner>
            ) : null}
          </>
        }
        panel={
          <TerminalPanelSection
            label={t("detail.history")}
            aside={
              page > 0 || hasNextPage ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || runsPageChanging}
                    aria-label={t("detail.newer_runs")}
                    title={t("detail.newer_runs")}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Text variant="data" tone="muted">
                    {t("detail.page", { page: page + 1 })}
                  </Text>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasNextPage || runsPageChanging}
                    aria-label={t("detail.older_runs")}
                    title={t("detail.older_runs")}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null
            }
          >
            {runsLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("detail.loading_short")}
              </p>
            ) : runs.length === 0 ? (
              <p className="text-meta text-muted-foreground">
                {t("detail.empty_runs_prefix")}{" "}
                <span className="font-medium text-foreground">
                  {t("detail.run_now")}
                </span>{" "}
                {t("detail.empty_runs_suffix")}
              </p>
            ) : (
              <ul
                className={cn(
                  "-mx-2 space-y-0.5 transition-opacity",
                  runsPageChanging && "opacity-60"
                )}
              >
                {runs.map((run) => {
                  const active = run.id === selectedId
                  return (
                    <li key={run.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectRun(run.id)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "min-h-11 w-full rounded-md px-2 py-2 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          active ? "bg-muted" : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <RunStatusTag
                            status={run.status}
                            hostsOk={run.hostsOk}
                            hostsFailed={run.hostsFailed}
                          />
                          <span className="flex items-center gap-2 text-xs text-muted-foreground">
                            {run.commitSha ? (
                              <Text
                                variant="data"
                                tone="muted"
                                title={run.commitSha}
                              >
                                {run.commitSha.slice(0, 7)}
                              </Text>
                            ) : null}
                            {run.trigger === "schedule"
                              ? t("detail.trigger_schedule")
                              : t("detail.trigger_manual")}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <Text
                            variant="data"
                            tone="muted"
                            className="truncate"
                          >
                            {formatDateTime(
                              run.startedAt ?? run.createdAt,
                              i18n.language
                            )}
                          </Text>
                          <RunHostSummary
                            hostsOk={run.hostsOk}
                            hostsFailed={run.hostsFailed}
                          />
                          <Text
                            variant="data"
                            tone="muted"
                            className="shrink-0"
                          >
                            {formatDuration(run)}
                          </Text>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TerminalPanelSection>
        }
      >
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
          <p className="px-4 text-sm text-terminal-subtle select-none">
            {t("detail.select_run")}
          </p>
        )}
      </TerminalFrame>
    </>
  )
}

function JobNotFound() {
  const { t } = useTranslation("jobs")
  return <StateCard tone="destructive" title={t("detail.not_found")} />
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
