import { getIcon } from "@/lib/icon-registry"

const AlertTriangle = getIcon("status", "alert")
const CheckCircle2 = getIcon("status", "success")
const XCircle = getIcon("status", "error")

import { type ReactNode, useEffect, useRef } from "react"
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

/** Same condition as the `stacked` variant in `global.css`. */
const STACKED_QUERY = "not all and (min-width: 48rem) and (min-height: 34rem)"

/**
 * The shared frame of every execution screen (commands, script run,
 * playbook run, job detail): a terminal column with a title bar showing the
 * prompt, the console body, stream/result banners, and an optional side
 * panel. The terminal is dark in both themes and uses only `--terminal-*`
 * tokens; the side panel uses the page theme.
 *
 * On `stacked` viewports (phones, landscape phones) the page scrolls
 * instead of splitting the height.
 * With `setupFirst` the panel (what to run, where) comes before the console
 * there, and once `active` turns on the console scrolls into view so the
 * output follows the tap on the run button.
 */
export function TerminalFrame({
  context,
  privileged = false,
  command,
  children,
  banners,
  panel,
  panelFooter,
  setupFirst = false,
  active = false,
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
  /** Phones: render the panel above the console (configure, then run). */
  setupFirst?: boolean
  /** A run is streaming; on phones with `setupFirst` it reveals the console. */
  active?: boolean
  className?: string
}) {
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!setupFirst || !active) return
    if (!window.matchMedia(STACKED_QUERY).matches) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    consoleRef.current?.scrollIntoView({
      block: "start",
      behavior: reduce.matches ? "auto" : "smooth",
    })
  }, [active, setupFirst])

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border lg:flex-row",
        className
      )}
    >
      <div
        ref={consoleRef}
        className="flex min-h-[65dvh] flex-1 scroll-mt-4 flex-col overflow-hidden bg-terminal-bg text-terminal-fg split:min-h-0"
      >
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
        <aside
          className={cn(
            "flex min-h-0 shrink-0 flex-col overflow-hidden border-t bg-background split:max-h-[46dvh] lg:max-h-none lg:w-72 lg:border-t-0 lg:border-l",
            setupFirst &&
              "stacked:order-first stacked:border-t-0 stacked:border-b"
          )}
        >
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
