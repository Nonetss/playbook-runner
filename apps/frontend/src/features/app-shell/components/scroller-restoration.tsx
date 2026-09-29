import { type RefObject, useCallback, useEffect, useRef, useState } from "react"
import { useCurrentPath } from "@/hooks/use-current-path"
import { useElementScrollRestoration } from "@/hooks/use-scroll-restoration"

/** Static empty ref: makes the restoration hook a no-op for "owned" pages. */
const OWNED_ELEMENT_REF: RefObject<HTMLElement | null> = { current: null }

type ScrollMode = "default" | "off" | "owned"

function findScroller() {
  return document.querySelector<HTMLElement>("[data-app-scroller]")
}

function scrollMode(scroller: HTMLElement | null): ScrollMode {
  const value = scroller?.dataset.persistScroll
  if (value === "owned") return "owned"
  if (value === "false") return "off"
  return "default"
}

/**
 * Restores the `WithSidebar` inset scroll offset across View Transitions.
 * Lives inside the persisted sidebar island; the mode is read per page from
 * `data-persist-scroll` on the scroller (the layout's `persistScroll` prop),
 * never from a frozen island prop. `"false"` still snaps to the top;
 * `"owned"` leaves the page's own list in charge.
 */
export function ScrollerRestoration({ initialPath }: { initialPath: string }) {
  const pathname = useCurrentPath(initialPath)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const [pageLoad, setPageLoad] = useState(0)

  useEffect(() => {
    const onPageLoad = () => setPageLoad((count) => count + 1)
    document.addEventListener("astro:page-load", onPageLoad)
    return () => document.removeEventListener("astro:page-load", onPageLoad)
  }, [])

  const scroller = typeof document === "undefined" ? null : findScroller()
  scrollerRef.current = scroller
  const mode = scrollMode(scroller)

  // Recreated on every real navigation so the hook re-binds to the swapped
  // scroller; the key reads the live URL at each save.
  const resolveKey = useCallback(
    () => `app-inset:${window.location.pathname}${window.location.search}`,
    [pathname, pageLoad]
  )

  useElementScrollRestoration(
    mode === "owned" ? OWNED_ELEMENT_REF : scrollerRef,
    mode === "default" ? resolveKey : undefined
  )

  return null
}
