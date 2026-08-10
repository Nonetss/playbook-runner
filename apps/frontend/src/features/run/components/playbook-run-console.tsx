// Structured, card-based rendering of a playbook run's live event stream —
// mirrors the per-host card treatment RunHostConsole gives ad-hoc runs, but
// grouped by PLAY → TASK → per-host result plus a PLAY RECAP summary card,
// since a playbook naturally produces many tasks instead of one implicit
// action per host.
import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const ArrowDown = getIcon("views", "scrollDown")
const CheckCircle2 = getIcon("status", "success")
const ClipboardList = getIcon("resources", "clipboard")
const Loader2 = getIcon("status", "loading")
const MinusCircle = getIcon("status", "minus")
const Computer = getIcon("resources", "device")
const Terminal = getIcon("resources", "terminal")
const XCircle = getIcon("status", "error")

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useFollowOutput } from "@/features/run/hooks/useFollowOutput"
import { cn } from "@/lib/utils"

// See RunHostConsole for why raw stdout/stderr get the native terminal font
// stack instead of the branded monospace font.
const TERMINAL_FONT_STACK =
  'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace'

type HostOutcome =
  | "running"
  | "ok"
  | "changed"
  | "failed"
  | "unreachable"
  | "skipped"

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

const STATUS_META: Record<
  HostOutcome,
  { icon: typeof Computer; textClass: string }
> = {
  running: { icon: Loader2, textClass: "text-primary" },
  ok: {
    icon: CheckCircle2,
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  changed: {
    icon: CheckCircle2,
    textClass: "text-amber-600 dark:text-amber-400",
  },
  failed: { icon: XCircle, textClass: "text-red-600 dark:text-red-400" },
  unreachable: {
    icon: AlertTriangle,
    textClass: "text-red-600 dark:text-red-400",
  },
  skipped: { icon: MinusCircle, textClass: "text-muted-foreground" },
}

function HostResultRow({ result }: { result: TaskHostResult }) {
  const { t } = useTranslation("common")
  const meta = STATUS_META[result.status]
  const Icon = meta.icon
  const stderrIsError =
    result.status === "failed" || result.status === "unreachable"

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <Computer className="size-3 shrink-0 text-zinc-600" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">
          {result.host}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 type-console-meta font-medium",
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
          <span className="shrink-0 font-mono type-console-meta text-zinc-600">
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
        <pre
          className="type-console-body mt-1 pl-5 whitespace-pre-wrap wrap-break-word text-zinc-400"
          style={{ fontFamily: TERMINAL_FONT_STACK }}
        >
          {result.stdout}
        </pre>
      ) : null}

      {result.stderr ? (
        <pre
          className={cn(
            "type-console-body mt-1 pl-5 whitespace-pre-wrap wrap-break-word",
            stderrIsError ? "text-destructive" : "text-muted-foreground"
          )}
          style={{ fontFamily: TERMINAL_FONT_STACK }}
        >
          {result.stderr}
        </pre>
      ) : null}
    </div>
  )
}

function TaskCard({ task }: { task: TaskBlock }) {
  const failCount = task.hosts.filter(
    (h) => h.status === "failed" || h.status === "unreachable"
  ).length
  const okCount = task.hosts.filter(
    (h) => h.status === "ok" || h.status === "changed"
  ).length

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/70 px-3 py-1.5">
        <Terminal className="size-3.5 shrink-0 text-zinc-500" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-zinc-200">
          {task.name || "—"}
        </span>
        {failCount > 0 ? (
          <span className="shrink-0 font-mono type-console-meta text-destructive">
            {failCount} fallo{failCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {okCount > 0 ? (
          <span className="shrink-0 font-mono type-console-meta text-zinc-600">
            {okCount} ok
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-zinc-800/60">
        {task.hosts.map((h, i) => (
          <HostResultRow key={`${h.host}-${i}`} result={h} />
        ))}
      </div>
    </div>
  )
}

function RecapCard({ rows }: { rows: RecapRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/70 px-3 py-1.5">
        <ClipboardList className="size-3.5 shrink-0 text-zinc-500" />
        <span className="font-mono text-xs font-medium text-zinc-200">
          PLAY RECAP
        </span>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {rows.map((row) => {
          const status =
            row.failed > 0 || row.unreachable > 0
              ? "failed"
              : row.changed > 0
                ? "changed"
                : row.ok > 0
                  ? "ok"
                  : "skipped"
          const tone = STATUS_META[status].textClass
          return (
            <div
              key={row.host}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 font-mono type-console-meta"
            >
              <span className={cn("min-w-0 flex-1 truncate", tone)}>
                {row.host}
              </span>
              <span className="text-zinc-500">ok={row.ok}</span>
              <span className="text-zinc-500">changed={row.changed}</span>
              <span className="text-zinc-500">
                unreachable={row.unreachable}
              </span>
              <span className="text-zinc-500">failed={row.failed}</span>
              <span className="text-zinc-500">skipped={row.skipped}</span>
            </div>
          )
        })}
      </div>
    </div>
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
        <p className="flex items-center gap-2 px-3 text-sm text-zinc-500 sm:px-5">
          <Loader2 className="size-3.5 animate-spin" />
          {t("run_console.starting")}
        </p>
      )
    }
    return (
      <p className="px-3 text-sm text-zinc-600 select-none sm:px-5">
        {emptyHint ?? idlePrompt ?? t("run_console.no_output")}
      </p>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div className="space-y-4 p-3 sm:p-5">
          {plays.map((play) => (
            <div key={play.key} className="space-y-2">
              {play.name ? (
                <p className="px-0.5 font-mono type-console-meta font-semibold tracking-wide text-zinc-500 uppercase">
                  PLAY{" "}
                  <span className="text-zinc-300 normal-case">{play.name}</span>
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
            <span className="inline-block animate-pulse text-zinc-400">▋</span>
          ) : null}
        </div>
      </div>
      {following ? null : (
        <Button
          size="sm"
          variant="secondary"
          onClick={jumpToLatest}
          className="absolute right-3 bottom-3 shadow-md sm:right-5 sm:bottom-5"
        >
          <ArrowDown className="size-3.5" />
          {t("run_console.jump_to_latest")}
        </Button>
      )}
    </div>
  )
}
