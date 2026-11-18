import type { ComponentProps } from "react"
import { AppLink } from "@/components/ui/app-link"
import {
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-ring"
const pillInactive =
  "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
const pillActive = "bg-primary/10 text-primary"

// Radix returns focus to the trigger when a menu link closes the menu, and the
// navbar persists across navigations, so the active pill must survive the
// trigger's hover, focus and open states instead of the shadcn defaults.
const triggerInactive = cn(
  pillInactive,
  "bg-transparent focus:bg-transparent data-[state=open]:bg-muted/40 data-[state=open]:hover:bg-muted/40 data-[state=open]:focus:bg-muted/40"
)
const triggerActive = cn(
  pillActive,
  "hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary data-[state=open]:hover:bg-primary/10 data-[state=open]:focus:bg-primary/10"
)

export type NavbarPillLinkProps = ComponentProps<typeof AppLink> & {
  active?: boolean
}

/**
 * A navbar section with no sub-pages: a pill that links straight to it.
 * `NavigationMenuLink` brings `flex-col` through `asChild`, so the pill sets
 * `flex-row` to keep a trailing status dot beside the label.
 */
export function NavbarPillLink({
  active = false,
  className,
  ...props
}: NavbarPillLinkProps) {
  return (
    <NavigationMenuLink asChild active={active}>
      <AppLink
        aria-current={active ? "page" : undefined}
        className={cn(
          pillBase,
          "flex-row",
          active ? pillActive : pillInactive,
          className
        )}
        {...props}
      />
    </NavigationMenuLink>
  )
}

export type NavbarPillTriggerProps = ComponentProps<
  typeof NavigationMenuTrigger
> & {
  active?: boolean
}

/** A navbar section with sub-pages: the pill that opens its dropdown. */
export function NavbarPillTrigger({
  active = false,
  className,
  ...props
}: NavbarPillTriggerProps) {
  return (
    <NavigationMenuTrigger
      aria-current={active ? "page" : undefined}
      className={cn(
        pillBase,
        "h-auto",
        active ? triggerActive : triggerInactive,
        className
      )}
      {...props}
    />
  )
}
