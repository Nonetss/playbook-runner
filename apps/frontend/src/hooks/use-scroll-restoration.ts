import { type RefObject, useLayoutEffect, useRef } from "react"
import { createSimpleViewState } from "@/lib/view-state"

const RESTORE_MS = 2500

/**
 * Restores an element's scrollTop across Astro View Transitions. When
 * `resolveStorageKey` is set, the offset is persisted in sessionStorage
 * under the key it returns; when it is omitted, the scroller still snaps to
 * 0 (the same overflow container is reused across sidebar pages, so a
 * leftover offset from the previous route would otherwise land the new page
 * at the bottom) but nothing is saved.
 *
 * The key is resolved at mount (for the initial restore) and again on each
 * save while the page is current, so a `history.replaceState` change made
 * elsewhere (e.g. a filter change) is picked up without an effect rerun.
 * Once a navigation starts (`popstate`, `astro:before-preparation`) the key
 * is frozen: by then, or by the time the effect cleans up, `location`
 * already points at the destination, and resolving it would store this
 * page's offset under the next page's key.
 *
 * Restore keeps retrying while the content grows (nested islands, infinite
 * lists) and never overwrites a saved offset with 0 when the scroller is
 * swapped out from under us.
 */
export function useElementScrollRestoration(
  elementRef: RefObject<HTMLElement | null>,
  resolveStorageKey: (() => string) | undefined
) {
  const lastYRef = useRef(0)

  useLayoutEffect(() => {
    const el = elementRef.current
    if (!el) return

    let key = resolveStorageKey?.()
    let leaving = false
    const currentKey = () => {
      if (resolveStorageKey && !leaving) key = resolveStorageKey()
      return key
    }

    const saved = key ? (createSimpleViewState(key).read()?.scrollY ?? 0) : 0
    const target = Math.max(0, saved)
    lastYRef.current = target
    el.scrollTop = target
    let done = target <= 0
    let interval = 0

    const persist = (y: number) => {
      lastYRef.current = y
      const storageKey = currentKey()
      if (storageKey) createSimpleViewState(storageKey).save(y, {})
    }

    const stopRestoring = () => {
      done = true
      resize.disconnect()
      mutations.disconnect()
      window.clearInterval(interval)
    }

    const restore = () => {
      if (done) return
      el.scrollTop = target
      if (Math.abs(el.scrollTop - target) <= 1) {
        persist(target)
        stopRestoring()
      }
    }

    const onScroll = () => {
      // Scroll events fired while the next page swaps in are clamping, not
      // the user: they must not overwrite this page's saved offset.
      if (leaving) return
      if (done) {
        persist(el.scrollTop)
        return
      }
      if (Math.abs(el.scrollTop - target) <= 1) {
        persist(target)
        stopRestoring()
        return
      }
      const max = Math.max(0, el.scrollHeight - el.clientHeight)
      // Content is still too short: restore clamped to the max and must
      // not clobber the saved offset with that temporary value.
      if (max < target - 1) return
      persist(el.scrollTop)
      stopRestoring()
    }

    // A restoration may still be waiting for async content to reach its saved
    // offset. Once the user operates anything inside the scroller, that
    // position is no longer authoritative. In particular, an accordion adds
    // its panel after its trigger is pressed; the mutation observer below must
    // not then pull the viewport back to the old offset.
    const onUserIntent = () => {
      if (!done) stopRestoring()
    }

    const resize = new ResizeObserver(restore)
    resize.observe(el)
    const mutations = new MutationObserver(restore)
    mutations.observe(el, { childList: true, subtree: true })
    interval = window.setInterval(restore, 50)
    const stop = window.setTimeout(() => {
      window.clearInterval(interval)
    }, RESTORE_MS)

    restore()
    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("pointerdown", onUserIntent, { passive: true })
    el.addEventListener("keydown", onUserIntent)

    const beforeLeave = () => {
      leaving = true
      persist(lastYRef.current)
    }
    const onPopState = () => {
      leaving = true
    }
    // A reload keeps the URL, so the key may still be resolved.
    const onPageHide = () => persist(lastYRef.current)
    window.addEventListener("popstate", onPopState)
    document.addEventListener("astro:before-preparation", beforeLeave)
    document.addEventListener("astro:before-swap", beforeLeave)
    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(stop)
      resize.disconnect()
      mutations.disconnect()
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("pointerdown", onUserIntent)
      el.removeEventListener("keydown", onUserIntent)
      window.removeEventListener("popstate", onPopState)
      document.removeEventListener("astro:before-preparation", beforeLeave)
      document.removeEventListener("astro:before-swap", beforeLeave)
      window.removeEventListener("pagehide", onPageHide)
      persist(lastYRef.current)
    }
  }, [elementRef, resolveStorageKey])
}
