import type { ReactElement, ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface HintProps {
  /** Text shown in the bubble; usually the control's `aria-label`. */
  label: ReactNode
  /**
   * The control the bubble points at. It becomes the tooltip trigger, so it
   * must accept props and a ref (`Button`, `NavbarAction`, a menu trigger...).
   */
  children: ReactElement
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

/**
 * Hover and focus bubble that names an icon-only control, in place of the
 * browser's native `title`. Keep the control's own `aria-label`: the bubble is
 * a visual aid, not its accessible name. Touch devices never show it, so the
 * icon must still be understandable without it.
 *
 * It mounts its own provider because the navbar, the toaster and the
 * back-to-top button are separate React islands that share no ancestor.
 */
export function Hint({ label, children, side = "top", align }: HintProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={6}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
