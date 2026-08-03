import type { ComponentPropsWithoutRef, MouseEvent } from "react"
import { navigate } from "@/lib/navigate"

type AppLinkProps = ComponentPropsWithoutRef<"a"> & {
  href: string
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
}

/** Internal link that uses Astro View Transitions via {@link navigate}. */
export function AppLink({ href, onClick, target, ...props }: AppLinkProps) {
  const isExternal = target === "_blank" || /^https?:\/\//.test(href)

  return (
    <a
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || isModifiedClick(event) || isExternal) {
          return
        }
        event.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}
