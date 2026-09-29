// Terminal-style output for ad-hoc runs (scripts, ad-hoc commands) that
// execute as a single implicit task across one or more hosts. Unlike a
// playbook run — which naturally reads well as a linear PLAY/TASK log because
// it has many tasks — an ad-hoc run only ever produces one result per host,
// so it renders better as a card per host with the raw output front and
// center instead of buried in dim ansible ceremony lines.
import { getIcon } from "@/lib/icon-registry"

const ArrowDown = getIcon("views", "scrollDown")
const Loader2 = getIcon("status", "loading")
const Computer = getIcon("resources", "device")

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useFollowOutput } from "@/features/run/hooks/use-follow-output"
import {
  isFailedStatus,
  RUN_HOST_STATUS,
  type RunHostStatus,
} from "@/features/run/status-tones"
import type { RunEvent, RunPhase } from "@/features/run/types"
import { cn } from "@/lib/utils"

// Raw stdout/stderr use `font-terminal` (native monospace stack) because
// scripts print box-drawing separators (═ ─ │) the brand mono lacks.

type HostStatus = RunHostStatus

type HostResult = {
  host: string
  status: HostStatus
  rc: number | null
  msg: string | null
  stdout: string | null
  stderr: string | null
}

function buildHostResults(events: RunEvent[]): HostResult[] {
  const order: string[] = []
  const byHost = new Map<string, HostResult>()

  function entry(host: string): HostResult {
    let existing = byHost.get(host)
    if (!existing) {
      existing = {
        host,
        status: "running",
        rc: null,
        msg: null,
        stdout: null,
        stderr: null,
      }
      byHost.set(host, existing)
      order.push(host)
    }
    return existing
  }

  for (const event of events) {
    const host = event.host
    if (!host) continue

    switch (event.event) {
      case "runner_on_start":
        entry(host)
        break
      case "runner_on_ok":
        Object.assign(entry(host), {
          status: event.changed ? "changed" : "ok",
          rc: event.rc,
          stdout: event.stdout,
          stderr: event.stderr,
        } satisfies Partial<HostResult>)
        break
      case "runner_on_failed":
        Object.assign(entry(host), {
          status: "failed",
          rc: event.rc,
          msg: event.msg,
          stdout: event.stdout,
          stderr: event.stderr,
        } satisfies Partial<HostResult>)
        break
      case "runner_on_unreachable":
        Object.assign(entry(host), {
          status: "unreachable",
          msg: event.msg,
        } satisfies Partial<HostResult>)
        break
      case "runner_on_skipped":
        Object.assign(entry(host), {
          status: "skipped",
        } satisfies Partial<HostResult>)
        break
      default:
        break
    }
  }

  return order.map((host) => byHost.get(host) as HostResult)
}

function HostCard({ result }: { result: HostResult }) {
  const { t } = useTranslation("common")
  const meta = RUN_HOST_STATUS[result.status]
  const Icon = meta.icon
  const hasStdout = !!result.stdout
  const hasStderr = !!result.stderr
  // SSH prints benign notices to stderr on every piped task (e.g. "Shared
  // connection to X closed."), so a non-empty stderr doesn't mean the host
  // failed — only flag it red when the run actually did.
  const stderrIsError = isFailedStatus(result.status)

  return (
    <div className="overflow-hidden rounded-lg border border-terminal-border bg-terminal-surface">
      <div className="flex items-center gap-2 border-b border-terminal-border bg-terminal-raised px-3 py-1.5">
        <Computer className="size-3.5 shrink-0 text-terminal-subtle" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-terminal-fg">
          {result.host}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 font-mono text-console-meta font-medium",
            meta.textClass
          )}
        >
          <Icon
            className={cn(
              "size-3.5",
              result.status === "running" && "animate-spin"
            )}
          />
          {t(`run_console.status.${result.status}`)}
        </span>
        {result.rc != null ? (
          <span className="shrink-0 font-mono text-console-meta text-terminal-subtle">
            rc={result.rc}
          </span>
        ) : null}
      </div>

      <div className="px-3 py-2.5">
        {result.status === "running" ? (
          <p className="text-xs text-terminal-muted">
            {t("run_console.waiting")}
          </p>
        ) : null}

        {result.msg ? (
          <p
            className={cn(
              "whitespace-pre-wrap wrap-break-word font-mono text-xs",
              meta.textClass
            )}
          >
            {result.msg}
          </p>
        ) : null}

        {hasStdout ? (
          <pre className="font-terminal text-console whitespace-pre-wrap wrap-break-word text-terminal-fg">
            {result.stdout}
          </pre>
        ) : null}

        {!hasStdout &&
        !hasStderr &&
        !result.msg &&
        result.status !== "running" ? (
          <p className="text-xs text-terminal-subtle">
            {t("run_console.no_output")}
          </p>
        ) : null}

        {hasStderr ? (
          <div
            className={cn(
              "pt-2",
              "border-terminal-border",
              hasStdout && "mt-2 border-t"
            )}
          >
            <p
              className={cn(
                "mb-1 font-mono text-console-meta font-semibold tracking-wide uppercase",
                stderrIsError ? "text-terminal-failed" : "text-terminal-subtle"
              )}
            >
              {t("run_console.stderr")}
            </p>
            <pre
              className={cn(
                "font-terminal text-console whitespace-pre-wrap wrap-break-word",
                stderrIsError ? "text-terminal-failed" : "text-terminal-muted"
              )}
            >
              {result.stderr}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function RunHostConsole({
  phase,
  events,
  idlePrompt,
  emptyHint,
}: {
  phase: RunPhase
  events: RunEvent[]
  idlePrompt: string
  emptyHint?: string
}) {
  const { t } = useTranslation("common")
  const results = useMemo(() => buildHostResults(events), [events])
  const { containerRef, following, jumpToLatest, handleScroll } =
    useFollowOutput()

  if (phase === "idle") {
    return (
      <p className="px-4 text-sm text-terminal-subtle select-none">
        {idlePrompt}
      </p>
    )
  }

  if (results.length === 0) {
    if (phase === "running") {
      return (
        <p className="flex items-center gap-2 px-4 text-sm text-terminal-muted">
          <Loader2 className="size-3.5 animate-spin" />
          {t("run_console.starting")}
        </p>
      )
    }
    // A separate banner already reports the error; avoid a redundant line.
    if (phase === "error") return null
    return (
      <p className="px-4 text-sm text-terminal-subtle select-none">
        {emptyHint ?? t("run_console.no_output")}
      </p>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        // Own scroll region only when the page splits the height; stacked
        // (phones) the console grows and the page scrolls (`overflow-x-clip`, not
        // `hidden`, which would turn Y into a scroller), so a finger on the
        // output never lands on a scroll container that swallows the swipe.
        className="min-h-0 flex-1 overflow-x-clip split:overflow-x-hidden split:overflow-y-auto split:overscroll-contain"
      >
        <div className="space-y-3 px-4 pb-4">
          {results.map((result) => (
            <HostCard key={result.host} result={result} />
          ))}
          {phase === "running" ? (
            <span className="inline-block animate-pulse text-terminal-muted">
              ▋
            </span>
          ) : null}
        </div>
      </div>
      {following ? null : (
        <Button
          size="sm"
          variant="terminal"
          onClick={jumpToLatest}
          className="absolute right-4 bottom-4"
        >
          <ArrowDown className="size-3.5" />
          {t("run_console.jump_to_latest")}
        </Button>
      )}
    </div>
  )
}
