import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatusDotTone =
  | "primary"
  | "border"
  | "destructive"
  | "foreground"
  | "muted"

const toneClass: Record<StatusDotTone, string> = {
  primary: "bg-primary",
  border: "bg-border",
  destructive: "bg-destructive",
  foreground: "bg-foreground",
  muted: "bg-muted-foreground/40",
}

export function StatusDot({
  tone = "primary",
  pulse = false,
  className,
}: {
  tone?: StatusDotTone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 rounded-full",
        toneClass[tone],
        pulse && "animate-pulse",
        className
      )}
    />
  )
}

export function StatusTag({
  children,
  dotTone,
  pulse = false,
  title,
  className,
}: {
  children: ReactNode
  dotTone?: StatusDotTone
  pulse?: boolean
  title?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "type-label flex items-center gap-1.5 text-muted-foreground",
        className
      )}
      title={title}
    >
      {dotTone ? <StatusDot tone={dotTone} pulse={pulse} /> : null}
      {children}
    </span>
  )
}
