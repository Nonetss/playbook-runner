import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

let mediaQuery: MediaQueryList | undefined

function getMediaQuery() {
  mediaQuery ??= window.matchMedia(QUERY)
  return mediaQuery
}

function subscribe(onChange: () => void) {
  const mql = getMediaQuery()
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getSnapshot = () => getMediaQuery().matches
const getServerSnapshot = () => false

/**
 * `true` on viewports narrower than the `md` breakpoint.
 *
 * Reads the media query during render via `useSyncExternalStore` rather than
 * settling it in an effect, so the first client paint is already correct
 * instead of flashing the desktop layout for a frame.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const TABLET_QUERY = `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: 1023.98px)`

let tabletQuery: MediaQueryList | undefined

function getTabletQuery() {
  tabletQuery ??= window.matchMedia(TABLET_QUERY)
  return tabletQuery
}

function subscribeTablet(onChange: () => void) {
  const mql = getTabletQuery()
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** `true` between the `md` and `lg` breakpoints (tablet portrait). */
export function useIsTablet() {
  return useSyncExternalStore(
    subscribeTablet,
    () => getTabletQuery().matches,
    getServerSnapshot
  )
}
