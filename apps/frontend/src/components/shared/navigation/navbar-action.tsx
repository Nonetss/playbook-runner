import type { ComponentPropsWithRef } from "react"
import { cn } from "@/lib/utils"

/**
 * The one style of every navbar action (language, theme, search, account,
 * slide-out menu): a square icon button with a hairline border, a translucent
 * fill and no resting shadow. Hover, focus or an open menu tint the border
 * with the accent. 44px below `lg`, where the navbar is driven by touch, and
 * 36px from it.
 *
 * Open state reads `aria-expanded`, not `data-state`: a `Hint` and a menu
 * trigger can share one element, and both write `data-state`.
 */
export const navbarActionClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-accent-foreground focus-ring focus-visible:border-primary/30 focus-visible:bg-accent focus-visible:text-accent-foreground aria-expanded:border-primary/30 aria-expanded:bg-accent aria-expanded:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 lg:size-9"

/** A navbar action button; also the child of a menu or sheet trigger `asChild`. */
export function NavbarAction({
  className,
  type = "button",
  ...props
}: ComponentPropsWithRef<"button">) {
  return (
    <button
      type={type}
      className={cn(navbarActionClass, className)}
      {...props}
    />
  )
}

/** A navbar action that is a link (the sign-in icon). */
export function NavbarActionLink({
  className,
  ...props
}: ComponentPropsWithRef<"a">) {
  return <a className={cn(navbarActionClass, className)} {...props} />
}
