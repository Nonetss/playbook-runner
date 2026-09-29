import { cva, type VariantProps } from "class-variance-authority"
import { createElement, type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const textVariants = cva("", {
  variants: {
    role: {
      display: "text-display font-semibold tracking-tight",
      stat: "text-stat font-semibold tracking-tight tabular-nums",
      headline: "text-headline font-medium tracking-tight",
      body: "text-body",
      meta: "text-meta leading-relaxed",
      "meta-sm": "text-meta-sm",
      label: "font-medium text-label uppercase tracking-[0.12em]",
      status: "text-xs uppercase tracking-[0.08em]",
      data: "font-mono text-xs tabular-nums tracking-tight",
      compact: "text-xs",
    },
    tone: {
      default: "",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    role: "body",
    tone: "default",
  },
})

type TextElement =
  | "div"
  | "p"
  | "span"
  | "label"
  | "dt"
  | "dd"
  | "h1"
  | "h2"
  | "h3"

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  as?: TextElement
  variant?: VariantProps<typeof textVariants>["role"]
  tone?: VariantProps<typeof textVariants>["tone"]
  htmlFor?: string
  children: ReactNode
}

/**
 * The product typography API. Components choose a semantic role instead of
 * rebuilding font size, weight, tracking and leading with Tailwind utilities
 * at every call site. Layout remains local; the visual language does not.
 */
export function Text({
  as = "span",
  variant,
  tone,
  className,
  children,
  ...props
}: TextProps) {
  return createElement(
    as,
    {
      ...props,
      className: cn(textVariants({ role: variant, tone }), className),
    },
    children
  )
}

/**
 * Inputs and textareas that hold technical values (keys, cron, extra vars)
 * use the data role. `md:text-xs` beats the control's own `md:text-sm`, so
 * the value keeps one size on every mouse screen; touch pointers still get
 * 16px from the control (no iOS focus zoom).
 */
export const dataFieldClass = "font-mono text-xs md:text-xs"

export { textVariants }
