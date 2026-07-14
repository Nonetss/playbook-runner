// Terminal-style output for ad-hoc runs (scripts, ad-hoc commands) that
// execute as a single implicit task across one or more hosts. Unlike a
// playbook run — which naturally reads well as a linear PLAY/TASK log because
// it has many tasks — an ad-hoc run only ever produces one result per host,
// so it renders better as a card per host with the raw output front and
// center instead of buried in dim ansible ceremony lines.
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Server,
  XCircle,
} from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type {
  RunEvent,
  RunPhase,
} from "@/components/features/playbooks/hooks/useRunPlaybook"
import { cn } from "@/lib/utils"

// Raw stdout/stderr can contain box-drawing characters (═, ─, │…) that
// scripts commonly use as section separators. Geist Mono (this app's
// branded --font-mono) doesn't ship glyphs for that Unicode block, so the
// browser falls back per-character to whatever's next in the stack — and
// that substitute's advance width rarely matches Geist Mono's grid, which
// makes the fallback glyphs collide with neighboring characters. Native OS
// terminal fonts are built with full, correctly-metriced box-drawing
// coverage, so raw output uses that stack instead of the branded one.
const TERMINAL_FONT_STACK =
  'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace'

type HostStatus =
  | "running"
  | "ok"
  | "changed"
  | "failed"
  | "unreachable"
  | "skipped"

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

const STATUS_META: Record<
  HostStatus,
  { icon: typeof Server; textClass: string }
> = {
  running: { icon: Loader2, textClass: "text-sky-400" },
  ok: { icon: CheckCircle2, textClass: "text-emerald-400" },
  changed: { icon: CheckCircle2, textClass: "text-amber-400" },
  failed: { icon: XCircle, textClass: "text-red-400" },
  unreachable: { icon: AlertTriangle, textClass: "text-red-400" },
  skipped: { icon: MinusCircle, textClass: "text-zinc-500" },
}

function HostCard({ result }: { result: HostResult }) {
  const { t } = useTranslation("common")
  const meta = STATUS_META[result.status]
  const Icon = meta.icon
  const hasStdout = !!result.stdout
  const hasStderr = !!result.stderr
  // SSH prints benign notices to stderr on every piped task (e.g. "Shared
  // connection to X closed."), so a non-empty stderr doesn't mean the host
  // failed — only flag it red when the run actually did.
  const stderrIsError =
    result.status === "failed" || result.status === "unreachable"

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-900/70 px-3 py-1.5">
        <Server className="size-3.5 shrink-0 text-zinc-500" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-zinc-200">
          {result.host}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 text-[11px] font-medium",
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
          <span className="shrink-0 font-mono text-[11px] text-zinc-600">
            rc={result.rc}
          </span>
        ) : null}
      </div>

      <div className="px-3 py-2.5">
        {result.status === "running" ? (
          <p className="text-xs text-zinc-500">{t("run_console.waiting")}</p>
        ) : null}

        {result.msg ? (
          <p
            className={cn(
              "whitespace-pre-wrap break-words font-mono text-xs",
              meta.textClass
            )}
          >
            {result.msg}
          </p>
        ) : null}

        {hasStdout ? (
          <pre
            className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-100"
            style={{ fontFamily: TERMINAL_FONT_STACK }}
          >
            {result.stdout}
          </pre>
        ) : null}

        {!hasStdout &&
        !hasStderr &&
        !result.msg &&
        result.status !== "running" ? (
          <p className="text-xs text-zinc-600">{t("run_console.no_output")}</p>
        ) : null}

        {hasStderr ? (
          <div
            className={cn(
              "pt-2",
              stderrIsError ? "border-red-900/30" : "border-zinc-800/60",
              hasStdout && "mt-2 border-t"
            )}
          >
            <p
              className={cn(
                "mb-1 text-[10px] font-semibold tracking-wide uppercase",
                stderrIsError ? "text-red-500/70" : "text-zinc-600"
              )}
            >
              {t("run_console.stderr")}
            </p>
            <pre
              className={cn(
                "whitespace-pre-wrap break-words text-[13px] leading-relaxed",
                stderrIsError ? "text-red-400" : "text-zinc-500"
              )}
              style={{ fontFamily: TERMINAL_FONT_STACK }}
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

  if (phase === "idle") {
    return <p className="text-sm text-zinc-600 select-none">{idlePrompt}</p>
  }

  if (results.length === 0) {
    if (phase === "running") {
      return (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" />
          {t("run_console.starting")}
        </p>
      )
    }
    // A separate banner already reports the error; avoid a redundant line.
    if (phase === "error") return null
    return (
      <p className="text-sm text-zinc-600 select-none">
        {emptyHint ?? t("run_console.no_output")}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <HostCard key={result.host} result={result} />
      ))}
      {phase === "running" ? (
        <span className="inline-block animate-pulse text-zinc-400">▋</span>
      ) : null}
    </div>
  )
}
