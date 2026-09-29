import { useEffect, useState } from "react"

const APP_SCROLLER = "[data-app-scroller]"

function isPastThreshold(threshold: number) {
  if (window.scrollY > threshold) return true
  for (const node of document.querySelectorAll(APP_SCROLLER)) {
    if (node.scrollTop > threshold) return true
  }
  return false
}

/**
 * `true` once the page has been scrolled past `threshold` pixels.
 *
 * Returns `false` during SSR and on the first client paint to keep the
 * server-rendered navbar identical to the client's first render — the
 * listener is only attached after hydration.
 *
 * Listens in capture phase so nested scrollers (the sidebar inset on
 * `data-layout="locked"` pages) count, not only `window`. Also re-syncs on
 * Astro View Transition lifecycle events: the navbar uses
 * `transition:persist`, so this hook does not remount on soft navigations
 * and would otherwise keep a stale scrolled shadow after the scroll resets.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(isPastThreshold(threshold))
    update()
    window.addEventListener("scroll", update, { passive: true })
    document.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    })
    document.addEventListener("astro:after-swap", update)
    document.addEventListener("astro:page-load", update)
    return () => {
      window.removeEventListener("scroll", update)
      document.removeEventListener("scroll", update, { capture: true })
      document.removeEventListener("astro:after-swap", update)
      document.removeEventListener("astro:page-load", update)
    }
  }, [threshold])

  return scrolled
}
