import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { cn } from "@/lib/utils"

type PillMetrics = {
  left: number
  top: number
  width: number
  height: number
  visible: boolean
}

const hiddenPill: PillMetrics = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  visible: false,
}

function measurePill(container: HTMLElement, activeIndex: number): PillMetrics {
  if (activeIndex < 0) return hiddenPill

  const items = container.querySelectorAll<HTMLElement>("[data-sliding-pill-item]")
  const el = items[activeIndex]
  if (!el) return hiddenPill

  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()

  return {
    left: elRect.left - containerRect.left,
    top: elRect.top - containerRect.top,
    width: elRect.width,
    height: elRect.height,
    visible: true,
  }
}

export interface SlidingPillNavProps extends ComponentPropsWithoutRef<"ul"> {
  activeIndex: number
  pillClassName?: string
}

export function SlidingPillNav({
  activeIndex,
  pillClassName,
  className,
  children,
  ...props
}: SlidingPillNavProps) {
  const containerRef = useRef<HTMLUListElement>(null)
  const [pill, setPill] = useState<PillMetrics>(hiddenPill)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => setPill(measurePill(container, activeIndex))

    update()

    const observer = new ResizeObserver(update)
    observer.observe(container)
    for (const item of container.querySelectorAll("[data-sliding-pill-item]")) {
      observer.observe(item)
    }

    return () => observer.disconnect()
  }, [activeIndex, children])

  return (
    <ul ref={containerRef} className={cn("relative", className)} {...props}>
      {pill.visible ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 rounded-lg bg-secondary shadow-sm",
            "motion-safe:transition-[transform,width,height] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.34,1.2,0.64,1)]",
            pillClassName
          )}
          style={{
            width: pill.width,
            height: pill.height,
            transform: `translate(${pill.left}px, ${pill.top}px)`,
          }}
        />
      ) : null}
      {children}
    </ul>
  )
}
