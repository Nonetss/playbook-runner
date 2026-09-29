// Structured, card-based rendering of a playbook run's live event stream —
// mirrors the per-host card treatment RunHostConsole gives ad-hoc runs, but
// grouped by PLAY → TASK → per-host result plus a PLAY RECAP summary card,
// since a playbook naturally produces many tasks instead of one implicit
// action per host.
import { getIcon } from "@/lib/icon-registry"

const ArrowDown = getIcon("views", "scrollDown")
const ClipboardList = getIcon("resources", "clipboard")
const Loader2 = getIcon("status", "loading")
const Computer = getIcon("resources", "device")
const Terminal = getIcon("resources", "terminal")

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  TerminalPanel,
  TerminalPanelMeta,
} from "@/features/run/components/terminal-panel"
import { useFollowOutput } from "@/features/run/hooks/use-follow-output"
import {
  isFailedStatus,
  RUN_HOST_STATUS,
  type RunHostStatus,
} from "@/features/run/status-tones"
import { cn } from "@/lib/utils"

// Raw stdout/stderr use `font-terminal`; see RunHostConsole.

type HostOutcome = RunHostStatus

type TaskHostResult = {
  host: string
  status: HostOutcome
  rc: number | null
  msg: string | null
  stdout: string | null
  stderr: string | null
}

type TaskBlock = { key: string; name: string; hosts: TaskHostResult[] }
type PlayBlock = { key: string; name: string; tasks: TaskBlock[] }
type RecapRow = {
  host: string
  ok: number
  changed: number
  unreachable: number
  failed: number
  skipped: number
}

/** Shape of the Ansible event payloads the backend streams during a run. */
type PlaybookEvent = {
  event?: string
  host?: string | null
  play?: string | null
  task?: string | null
  changed?: boolean | null
  msg?: string | null
  stdout?: string | null
  stderr?: string | null
  rc?: number | null
  stats?: {
    ok: Record<string, number>
    changed: Record<string, number>
    failures: Record<string, number>
    dark: Record<string, number>
    skipped: Record<string, number>
  } | null
}

type Parsed = { plays: PlayBlock[]; recap: RecapRow[] | null }

function parseEvents(raw: unknown[]): Parsed {
  const plays: PlayBlock[] = []
  let recap: RecapRow[] | null = null
  let playSeq = 0
  let taskSeq = 0

  function currentPlay(): PlayBlock {
    if (plays.length === 0) {
      plays.push({ key: `play-${playSeq++}`, name: "", tasks: [] })
    }
    return plays[plays.length - 1]
  }

  function currentTask(): TaskBlock {
    const play = currentPlay()
    if (play.tasks.length === 0) {
      play.tasks.push({ key: `task-${taskSeq++}`, name: "", hosts: [] })
    }
    return play.tasks[play.tasks.length - 1]
  }

  // Loop items (`runner_item_on_*`) always append a fresh row instead of
  // merging, since a single host can report multiple item results per task.
  function upsertHost(
    host: string,
    status: HostOutcome,
    patch: Partial<TaskHostResult> = {},
    append = false
  ) {
    const task = currentTask()
    if (!append) {
      const existing = task.hosts.find((h) => h.host === host)
      if (existing) {
        Object.assign(existing, { status, ...patch })
        return
      }
    }
    task.hosts.push({
      host,
      status,
      rc: null,
      msg: null,
      stdout: null,
      stderr: null,
      ...patch,
    })
  }

  for (const item of raw) {
    const e = item as PlaybookEvent
    const host = e.host ?? ""
    switch (e.event) {
      case "playbook_on_play_start":
        plays.push({ key: `play-${playSeq++}`, name: e.play ?? "", tasks: [] })
        break

      case "playbook_on_task_start":
        currentPlay().tasks.push({
          key: `task-${taskSeq++}`,
          name: e.task ?? "",
          hosts: [],
        })
        break

      case "runner_on_start":
        upsertHost(host, "running")
        break

      case "runner_on_ok":
        upsertHost(host, e.changed ? "changed" : "ok", {
          rc: e.rc ?? null,
          stdout: e.stdout ?? null,
          stderr: e.stderr ?? null,
        })
        break

      case "runner_on_skipped":
        upsertHost(host, "skipped")
        break

      case "runner_on_failed":
        upsertHost(host, "failed", {
          rc: e.rc ?? null,
          msg: e.msg ?? null,
          stdout: e.stdout ?? null,
          stderr: e.stderr ?? null,
        })
        break

      case "runner_on_unreachable":
        upsertHost(host, "unreachable", { msg: e.msg ?? null })
        break

      case "runner_item_on_ok":
        upsertHost(host, e.changed ? "changed" : "ok", {}, true)
        break

      case "runner_item_on_failed":
        upsertHost(host, "failed", { msg: e.msg ?? null }, true)
        break

      case "playbook_on_stats": {
        if (!e.stats) break
        const { ok, changed, failures, dark, skipped } = e.stats
        const hosts = Array.from(
          new Set([
            ...Object.keys(ok),
            ...Object.keys(changed),
            ...Object.keys(failures),
            ...Object.keys(dark),
            ...Object.keys(skipped),
          ])
        ).sort()
        recap = hosts.map((h) => ({
          host: h,
          ok: ok[h] ?? 0,
          changed: changed[h] ?? 0,
          unreachable: dark[h] ?? 0,
          failed: failures[h] ?? 0,
          skipped: skipped[h] ?? 0,
        }))
        break
      }

      default:
        break
    }
  }

  for (const play of plays) {
    play.tasks = play.tasks.filter((t) => t.name || t.hosts.length > 0)
  }
  return { plays: plays.filter((p) => p.name || p.tasks.length > 0), recap }
}

function HostResultRow({ result }: { result: TaskHostResult }) {
  const { t } = useTranslation("common")
  const meta = RUN_HOST_STATUS[result.status]
  const Icon = meta.icon
  const stderrIsError = isFailedStatus(result.status)

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <Computer className="size-3 shrink-0 text-terminal-subtle" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-terminal-fg">
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
              "size-3",
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

      {result.msg ? (
        <p
          className={cn(
            "mt-1 pl-5 whitespace-pre-wrap wrap-break-word font-mono text-xs",
            meta.textClass
          )}
        >
          {result.msg}
        </p>
      ) : null}

      {result.stdout ? (
        <pre className="font-terminal text-console mt-1 pl-5 whitespace-pre-wrap wrap-break-word text-terminal-muted">
          {result.stdout}
        </pre>
      ) : null}

      {result.stderr ? (
        <pre
          className={cn(
            "font-terminal text-console mt-1 pl-5 whitespace-pre-wrap wrap-break-word",
            stderrIsError ? "text-terminal-failed" : "text-terminal-subtle"
          )}
        >
          {result.stderr}
        </pre>
      ) : null}
    </div>
  )
}

function TaskCard({ task }: { task: TaskBlock }) {
  const { t } = useTranslation("common")
  const failCount = task.hosts.filter((h) => isFailedStatus(h.status)).length
  const okCount = task.hosts.filter(
    (h) => h.status === "ok" || h.status === "changed"
  ).length

  return (
    <TerminalPanel
      icon={Terminal}
      title={task.name || "—"}
      meta={
        <>
          {failCount > 0 ? (
            <TerminalPanelMeta className="text-terminal-failed">
              {t("run_console.failures", { count: failCount })}
            </TerminalPanelMeta>
          ) : null}
          {okCount > 0 ? (
            <TerminalPanelMeta>{okCount} ok</TerminalPanelMeta>
          ) : null}
        </>
      }
    >
      <div className="divide-y divide-terminal-border">
        {task.hosts.map((h, i) => (
          <HostResultRow key={`${h.host}-${i}`} result={h} />
        ))}
      </div>
    </TerminalPanel>
  )
}

function RecapCard({ rows }: { rows: RecapRow[] }) {
  const { t } = useTranslation("common")
  return (
    <TerminalPanel
      icon={ClipboardList}
      title={t("run_console.recap")}
      titleClassName="uppercase"
    >
      <div className="divide-y divide-terminal-border">
        {rows.map((row) => {
          const status =
            row.failed > 0 || row.unreachable > 0
              ? "failed"
              : row.changed > 0
                ? "changed"
                : row.ok > 0
                  ? "ok"
                  : "skipped"
          const tone = RUN_HOST_STATUS[status].textClass
          return (
            <div
              key={row.host}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 font-mono text-console-meta"
            >
              <span className={cn("min-w-0 flex-1 truncate", tone)}>
                {row.host}
              </span>
              <span className="text-terminal-muted">
                {t("run_console.status.ok")}={row.ok}
              </span>
              <span className="text-terminal-muted">
                {t("run_console.status.changed")}={row.changed}
              </span>
              <span className="text-terminal-muted">
                {t("run_console.status.unreachable")}={row.unreachable}
              </span>
              <span className="text-terminal-muted">
                {t("run_console.status.failed")}={row.failed}
              </span>
              <span className="text-terminal-muted">
                {t("run_console.status.skipped")}={row.skipped}
              </span>
            </div>
          )
        })}
      </div>
    </TerminalPanel>
  )
}

export function PlaybookRunConsole({
  events,
  running = false,
  idlePrompt,
  emptyHint,
}: {
  events: unknown[]
  running?: boolean
  idlePrompt?: string
  emptyHint?: string
}) {
  const { t } = useTranslation("common")
  const { plays, recap } = useMemo(() => parseEvents(events), [events])
  const { containerRef, following, jumpToLatest, handleScroll } =
    useFollowOutput()

  if (plays.length === 0 && !recap) {
    if (running) {
      return (
        <p className="flex items-center gap-2 px-4 text-sm text-terminal-muted">
          <Loader2 className="size-3.5 animate-spin" />
          {t("run_console.starting")}
        </p>
      )
    }
    return (
      <p className="px-4 text-sm text-terminal-subtle select-none">
        {emptyHint ?? idlePrompt ?? t("run_console.no_output")}
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
        <div className="space-y-4 px-4 pb-4">
          {plays.map((play) => (
            <div key={play.key} className="space-y-2">
              {play.name ? (
                <p className="px-0.5 font-mono text-console-meta font-semibold tracking-wide text-terminal-subtle uppercase">
                  {t("run_console.play")}{" "}
                  <span className="text-terminal-fg normal-case">
                    {play.name}
                  </span>
                </p>
              ) : null}
              <div className="space-y-2">
                {play.tasks.map((task) => (
                  <TaskCard key={task.key} task={task} />
                ))}
              </div>
            </div>
          ))}
          {recap ? <RecapCard rows={recap} /> : null}
          {running ? (
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
