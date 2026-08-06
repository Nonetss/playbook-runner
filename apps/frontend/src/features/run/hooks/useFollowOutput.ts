import { useCallback, useLayoutEffect, useRef, useState } from "react"

// Pixels from the bottom within which we still consider the user "following"
// the tail of the stream. Slightly forgiving so a trailing margin / half-pixel
// scroll rounding doesn't disengage auto-scroll on a single wheel tick.
const FOLLOW_THRESHOLD_PX = 40

/** Sticky-tail scroll behavior for live event streams.
 *
 *  Mirrors Ansible AWX/Tower: keep the viewport pinned to the latest event
 *  as content grows, but disengage the moment the user scrolls up to inspect
 *  earlier output, and re-engage as soon as they return to the bottom. A
 *  `jumpToLatest()` callback lets a "Jump to latest" button resume following.
 *
 *  Returns a ref to attach to the scrollable element, the current following
 *  state, the jump callback, and an `onScroll` handler to wire to the same
 *  element. The hook has no dependencies — it observes DOM mutations through
 *  the ref-attached element, so it stays in sync regardless of how the parent
 *  re-renders.
 */
export function useFollowOutput() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [following, setFollowing] = useState(true)

  // Run after every render so we catch growth from any source — new events,
  // a recap that lands on completion, the trailing pulse glyph. `useLayoutEffect`
  // aligns the scroll position with the new height in the same paint, so the
  // user never sees an empty gap at the bottom while events stream in.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || !following) return
    el.scrollTop = el.scrollHeight
  })

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setFollowing(distanceFromBottom <= FOLLOW_THRESHOLD_PX)
  }

  const jumpToLatest = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setFollowing(true)
    el.scrollTop = el.scrollHeight
  }, [])

  return { containerRef, following, jumpToLatest, handleScroll }
}
