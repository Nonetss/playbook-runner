/** Input that means the user is scrolling or operating a surface: a scroll
 *  animation or an anchor correction running on it yields to it. Scroll
 *  events alone can't tell, since neither sees the ones it causes. */
export const USER_SCROLL_INTENT = [
  "wheel",
  "touchmove",
  "pointerdown",
  "keydown",
] as const

/** How long `animateScrollToTop` takes, whatever the distance. */
const SCROLL_TO_TOP_MS = 350

function scrollOffsetOf(target: HTMLElement | Window): number {
  return target instanceof Window ? target.scrollY : target.scrollTop
}

function setScrollOffset(target: HTMLElement | Window, offset: number) {
  if (target instanceof Window) target.scrollTo(0, offset)
  else target.scrollTop = offset
}

/**
 * Scrolls `target` back to its top, writing the offset on every frame until
 * it gets there, and stopping as soon as the user scrolls or presses
 * something.
 *
 * `scrollTo({ behavior: "smooth" })` can't be used for this: TanStack
 * Virtual compensates the scroll offset whenever a row above the fold is
 * measured for the first time — which is every row of a grid that restored
 * its anchor, since the rows it loaded to get there were never shown. That
 * compensation writes `scrollTop` directly, which cancels the browser's
 * smooth scroll, so the grid barely moves. Driving the animation ourselves
 * overrides those writes on the next frame and always reaches the top.
 */
export function animateScrollToTop(target: HTMLElement | Window) {
  const start = scrollOffsetOf(target)
  if (start <= 0) return

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setScrollOffset(target, 0)
    return
  }

  let frame = 0
  const startedAt = performance.now()

  const stop = () => {
    window.cancelAnimationFrame(frame)
    for (const type of USER_SCROLL_INTENT) {
      document.removeEventListener(type, stop, { capture: true })
    }
  }

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / SCROLL_TO_TOP_MS)
    const eased = 1 - (1 - progress) ** 3
    setScrollOffset(target, Math.max(0, start * (1 - eased)))
    if (progress >= 1) {
      stop()
      return
    }
    frame = window.requestAnimationFrame(tick)
  }

  for (const type of USER_SCROLL_INTENT) {
    document.addEventListener(type, stop, { capture: true, passive: true })
  }
  frame = window.requestAnimationFrame(tick)
}
