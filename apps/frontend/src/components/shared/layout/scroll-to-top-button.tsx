import { getIcon } from "@/lib/icon-registry"

const ScrollToTopIcon = getIcon("navigation", "scrollToTop")

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { useScrolled } from "@/hooks/use-scrolled"
import { animateScrollToTop } from "@/lib/scroll-root"

const APP_SCROLLER = "[data-app-scroller]"
const EXIT_ANIMATION_MS = 200

function scrollToTop() {
  animateScrollToTop(window)
  for (const node of document.querySelectorAll<HTMLElement>(APP_SCROLLER)) {
    animateScrollToTop(node)
  }
}

function pageWantsScrollToTop() {
  return document.querySelector("[data-scroll-to-top]") !== null
}

function ScrollToTopButtonInner({ threshold }: { threshold: number }) {
  const { t } = useTranslation("common")
  const scrolled = useScrolled(threshold)
  const [enabled, setEnabled] = useState(false)
  const visible = enabled && scrolled
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const update = () => setEnabled(pageWantsScrollToTop())
    update()
    document.addEventListener("astro:page-load", update)
    document.addEventListener("astro:after-swap", update)
    return () => {
      document.removeEventListener("astro:page-load", update)
      document.removeEventListener("astro:after-swap", update)
    }
  }, [])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      return
    }
    const timeout = setTimeout(() => setMounted(false), EXIT_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [visible])

  if (!mounted) return null

  return (
    <Button
      type="button"
      size="icon"
      data-slot="scroll-to-top"
      data-state={visible ? "open" : "closed"}
      className="size-11 rounded-full shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-75 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-75 data-[state=open]:slide-in-from-bottom-4 md:size-9"
      aria-label={t("labels.scroll_to_top")}
      title={t("labels.scroll_to_top")}
      onClick={scrollToTop}
    >
      <ScrollToTopIcon className="size-4" />
    </Button>
  )
}

/**
 * Floating "back to top" button, mounted once from `Layout.astro` inside a
 * tight fixed box (`.scroll-to-top-root` in `global.css`). It appears once
 * the window or the `[data-app-scroller]` inset scrolls past `threshold`,
 * and only on pages that opt in with `data-scroll-to-top` (the `scrollToTop`
 * layout prop).
 */
export function ScrollToTopButton({ threshold = 400 }: { threshold?: number }) {
  return (
    <AppProviders>
      <ScrollToTopButtonInner threshold={threshold} />
    </AppProviders>
  )
}
