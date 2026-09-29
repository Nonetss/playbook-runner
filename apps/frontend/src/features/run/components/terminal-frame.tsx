import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const CheckCircle2 = getIcon("status", "success")
const XCircle = getIcon("status", "error")

import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { cn } from "@/lib/utils"

export type TerminalBannerTone = "muted" | "ok" | "changed" | "failed"

const BANNER_TONE: Record<TerminalBannerTone, string> = {
  muted: "text-terminal-muted",
  ok: "text-terminal-ok",
  changed: "text-terminal-changed",
  failed: "text-terminal-failed",
}

const BANNER_ICON: Record<TerminalBannerTone, typeof CheckCircle2 | null> = {
  muted: null,
  ok: CheckCircle2,
  changed: AlertTriangle,
  failed: XCircle,
}

/**
 * A notice inside the terminal (stream state, run result, stored error).
 * Hairline frame on the raised terminal surface; the tone colours only the
 * text and icon.
 */
export function TerminalBanner({
  tone = "muted",
  icon,
  role,
  action,
  children,
}: {
  tone?: TerminalBannerTone
  icon?: ReactNode
  role?: "status" | "alert"
  action?: ReactNode
  children: ReactNode
}) {
  const Icon = BANNER_ICON[tone]
  return (
    <div
      role={role ?? (tone === "failed" ? "alert" : "status")}
      aria-live="polite"
      className={cn(
        "mx-4 mb-4 flex shrink-0 items-start gap-2 rounded-lg border border-terminal-border bg-terminal-raised px-3 py-2 text-xs",
        BANNER_TONE[tone]
      )}
    >
      <span className="mt-0.5 shrink-0 [&_svg]:size-3.5">
        {icon ?? (Icon ? <Icon /> : null)}
      </span>
      <div className="min-w-0 flex-1 wrap-break-word">{children}</div>
      {action ? <div className="-my-1 shrink-0">{action}</div> : null}
    </div>
  )
}

/** A labelled block of the side panel (inventory, options, history). */
export function TerminalPanelSection({
  label,
  aside,
  children,
  className,
}: {
  label: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Text as="h2" variant="label" tone="muted">
          {label}
        </Text>
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * The shared frame of every execution screen (commands, script run,
 * playbook run, job detail): a terminal column with a title bar showing the
 * prompt, the console body, stream/result banners, and an optional side
 * panel. The terminal is dark in both themes and uses only `--terminal-*`
 * tokens; the side panel uses the page theme.
 */
export function TerminalFrame({
  context,
  privileged = false,
  command,
  children,
  banners,
  panel,
  panelFooter,
  className,
}: {
  /** Prompt context, e.g. "playbook", "script" or the Ansible module. */
  context: ReactNode
  /** `#` instead of `$` when the run escalates privileges. */
  privileged?: boolean
  /** What runs, shown after the prompt symbol. */
  command: ReactNode
  /** The console body; it fills the remaining height. */
  children: ReactNode
  /** Stream status and result banners, rendered under the console. */
  banners?: ReactNode
  panel?: ReactNode
  /** Sticky footer of the side panel (the run button). */
  panelFooter?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border lg:flex-row",
        className
      )}
    >
      <div className="flex min-h-[65dvh] flex-1 flex-col overflow-hidden bg-terminal-bg text-terminal-fg md:min-h-0">
        <div className="flex shrink-0 items-center border-b border-terminal-border bg-terminal-raised px-4 py-2">
          <span className="truncate font-mono text-console-meta">
            <span className="text-terminal-subtle">{context}</span>
            <span className="mx-1.5 text-terminal-subtle">
              {privileged ? "#" : "$"}
            </span>
            <span className="text-terminal-fg">{command}</span>
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col pt-4">{children}</div>
        {banners}
      </div>

      {panel ? (
        <aside className="flex min-h-0 shrink-0 flex-col overflow-hidden border-t bg-background md:max-h-[46dvh] lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
            {panel}
          </div>
          {panelFooter ? (
            <div className="shrink-0 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panelFooter}
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
