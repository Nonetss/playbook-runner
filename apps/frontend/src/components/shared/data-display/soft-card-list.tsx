import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type DivProps = ComponentProps<"div">
type UlProps = ComponentProps<"ul">

/** Hairline-bordered card-list shell for semantic lists and detail rows. */
export function SoftCardList(
  props: (DivProps & { as?: "div" }) | (UlProps & { as: "ul" })
) {
  const { as = "div", className, children, ...rest } = props
  const classes = cn(
    "overflow-hidden rounded-xl border bg-card/40 divide-y",
    className
  )

  if (as === "ul") {
    return (
      <ul className={classes} {...(rest as UlProps)}>
        {children}
      </ul>
    )
  }
  return (
    <div className={classes} {...(rest as DivProps)}>
      {children}
    </div>
  )
}
