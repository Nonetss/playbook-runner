import { useEffect, useState } from "react"

/**
 * `true` once the page has been scrolled past `threshold` pixels.
 *
 * Returns `false` during SSR and on the first client paint to keep the
 * server-rendered navbar identical to the client's first render — the
 * listener is only attached after hydration.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [threshold])

  return scrolled
}
