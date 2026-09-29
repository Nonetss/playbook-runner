import { TerminalBanner } from "@/features/run/components/terminal-frame"

/** Final outcome of a finished run, shown under the console. */
export function RunResultBanner({
  result,
  message,
}: {
  result: { ok: boolean }
  message: string
}) {
  return (
    <TerminalBanner tone={result.ok ? "ok" : "failed"} role="status">
      {message}
    </TerminalBanner>
  )
}
