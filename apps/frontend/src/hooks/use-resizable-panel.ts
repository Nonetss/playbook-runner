import type { KeyboardEvent, PointerEvent } from "react"
import { type CSSProperties, useRef, useState } from "react"

const STORAGE_PREFIX = "panel-width:"
const KEYBOARD_STEP = 16
/** Of what the panel shares with its neighbour, which must stay usable. */
const MAX_SHARE = 0.5

/** A stored width; a read failure or a malformed value means no preference. */
function readWidth(key: string): number | null {
  try {
    const stored = Number(localStorage.getItem(STORAGE_PREFIX + key))
    return Number.isFinite(stored) && stored > 0 ? stored : null
  } catch {
    return null
  }
}

function writeWidth(key: string, width: number | null): void {
  try {
    if (width === null) localStorage.removeItem(STORAGE_PREFIX + key)
    else localStorage.setItem(STORAGE_PREFIX + key, String(width))
  } catch {
    // Ignore quota / private-mode failures: it only lasts this visit.
  }
}

/**
 * The width of a side panel on the right of its container, dragged from a
 * handle inside it and remembered in this browser. `panelStyle` goes on the
 * panel, with `lg:w-(--panel-width)`; `handleProps` on `PanelResizeHandle`.
 */
export function useResizablePanel({
  storageKey,
  defaultWidth,
}: {
  storageKey: string
  defaultWidth: number
}) {
  const [stored, setStored] = useState(() => readWidth(storageKey))
  const dragging = useRef(false)
  const width = Math.max(stored ?? defaultWidth, defaultWidth)
  // A pointer up can arrive before the render of the last move.
  const widthRef = useRef(width)
  widthRef.current = width

  const resizeTo = (handle: HTMLElement, next: number) => {
    const container = handle.parentElement?.parentElement
    const max = (container?.getBoundingClientRect().width ?? 0) * MAX_SHARE
    const limited = Math.round(Math.max(defaultWidth, Math.min(next, max)))
    widthRef.current = limited
    setStored(limited)
    return limited
  }

  const handleProps = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture?.(event.pointerId)
      dragging.current = true
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!dragging.current) return
      const panel = event.currentTarget.parentElement
      if (!panel) return
      resizeTo(
        event.currentTarget,
        panel.getBoundingClientRect().right - event.clientX
      )
    },
    onPointerUp: () => {
      if (!dragging.current) return
      dragging.current = false
      writeWidth(storageKey, widthRef.current)
    },
    onPointerCancel: () => {
      dragging.current = false
    },
    onDoubleClick: () => {
      setStored(null)
      writeWidth(storageKey, null)
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const change = { ArrowLeft: KEYBOARD_STEP, ArrowRight: -KEYBOARD_STEP }[
        event.key
      ]
      if (change === undefined) return
      event.preventDefault()
      writeWidth(storageKey, resizeTo(event.currentTarget, width + change))
    },
    "aria-valuenow": width,
    "aria-valuemin": defaultWidth,
  }

  return {
    panelStyle: { "--panel-width": `${width}px` } as CSSProperties,
    handleProps,
  }
}
