import type { JobRunEvent } from "@/components/features/jobs/types"
import { cn } from "@/lib/utils"

// ── terminal rendering ────────────────────────────────────────────────────────

type Tone = "ok" | "changed" | "fail" | "muted" | "info" | "header" | "dim"
type TerminalLine = { text: string; tone: Tone }

/** Shape of the Ansible event payloads the backend captures into a run. */
type Ev = {
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

const SEP_LEN = 72

function sep(label: string, char = "*") {
  const prefix = `${label} `
  return `${prefix}${char.repeat(Math.max(0, SEP_LEN - prefix.length))}`
}

function describeEvent(raw: JobRunEvent): TerminalLine[] {
  const e = raw as Ev
  switch (e.event) {
    case "playbook_on_start":
      return [{ text: sep("PLAYBOOK"), tone: "header" }]

    case "playbook_on_play_start":
      return [
        { text: "", tone: "dim" },
        { text: sep(`PLAY [${e.play ?? ""}]`), tone: "header" },
      ]

    case "playbook_on_task_start":
      return [
        { text: "", tone: "dim" },
        { text: sep(`TASK [${e.task ?? ""}]`, "-"), tone: "muted" },
      ]

    case "runner_on_ok": {
      const out: TerminalLine[] = e.changed
        ? [{ text: `changed: [${e.host ?? ""}]`, tone: "changed" }]
        : [{ text: `ok: [${e.host ?? ""}]`, tone: "ok" }]
      if (e.stdout)
        for (const l of e.stdout.split("\n"))
          if (l) out.push({ text: `  ${l}`, tone: "dim" })
      return out
    }

    case "runner_on_skipped":
      return [{ text: `skipping: [${e.host ?? ""}]`, tone: "muted" }]

    case "runner_on_failed": {
      const out: TerminalLine[] = [
        { text: `fatal: [${e.host ?? ""}]: FAILED!`, tone: "fail" },
      ]
      if (e.msg) out.push({ text: `  msg: ${e.msg}`, tone: "fail" })
      if (e.rc != null) out.push({ text: `  rc: ${e.rc}`, tone: "fail" })
      if (e.stdout) {
        out.push({ text: "  stdout:", tone: "muted" })
        for (const l of e.stdout.split("\n"))
          if (l) out.push({ text: `    ${l}`, tone: "dim" })
      }
      if (e.stderr) {
        out.push({ text: "  stderr:", tone: "fail" })
        for (const l of e.stderr.split("\n"))
          if (l) out.push({ text: `    ${l}`, tone: "fail" })
      }
      return out
    }

    case "runner_on_unreachable": {
      const out: TerminalLine[] = [
        { text: `fatal: [${e.host ?? ""}]: UNREACHABLE!`, tone: "fail" },
      ]
      if (e.msg) out.push({ text: `  msg: ${e.msg}`, tone: "fail" })
      return out
    }

    case "runner_item_on_ok":
      return [
        {
          text: e.changed
            ? `  changed: [${e.host ?? ""}] (item)`
            : `  ok: [${e.host ?? ""}] (item)`,
          tone: e.changed ? "changed" : "ok",
        },
      ]

    case "runner_item_on_failed":
      return [
        {
          text: `  failed: [${e.host ?? ""}] (item) — ${e.msg ?? ""}`,
          tone: "fail",
        },
      ]

    case "playbook_on_stats": {
      const out: TerminalLine[] = [
        { text: "", tone: "dim" },
        { text: sep("PLAY RECAP"), tone: "header" },
      ]
      if (!e.stats) return out
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
      for (const host of hosts) {
        const f = failures[host] ?? 0
        const d = dark[host] ?? 0
        const c = changed[host] ?? 0
        const tone: Tone = f > 0 || d > 0 ? "fail" : c > 0 ? "changed" : "ok"
        out.push({
          text: `${host.padEnd(36)}: ok=${ok[host] ?? 0}  changed=${c}  unreachable=${d}  failed=${f}  skipped=${skipped[host] ?? 0}`,
          tone,
        })
      }
      return out
    }

    default:
      return []
  }
}

const toneClass: Record<Tone, string> = {
  header: "text-zinc-100 font-semibold",
  ok: "text-emerald-400",
  changed: "text-amber-400",
  fail: "text-red-400",
  info: "text-zinc-300",
  muted: "text-zinc-400",
  dim: "text-zinc-600",
}

// ── component ─────────────────────────────────────────────────────────────────

export function JobRunOutput({
  events,
  running = false,
  emptyHint,
}: {
  events: JobRunEvent[]
  running?: boolean
  emptyHint?: string
}) {
  const lines = events.flatMap(describeEvent)

  return (
    <div className="overflow-hidden rounded-xl bg-zinc-950 p-3 sm:p-5">
      <div className="max-h-[60vh] overflow-x-auto overflow-y-auto font-mono text-[11px] leading-[1.6] sm:text-xs">
        <div className="min-w-max">
          {lines.length === 0 ? (
            <p className="select-none text-zinc-600">
              {running
                ? "Ejecución en curso, esperando salida…"
                : (emptyHint ?? "Sin salida registrada.")}
            </p>
          ) : (
            lines.map((line, i) => (
              <p
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only log
                key={i}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  toneClass[line.tone]
                )}
              >
                {line.text || " "}
              </p>
            ))
          )}
          {running ? (
            <span className="mt-1 inline-block animate-pulse text-zinc-400">
              ▋
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
