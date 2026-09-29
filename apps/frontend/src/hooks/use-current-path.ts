import { useEffect, useState } from "react"

/**
 * The current pathname, kept in sync across Astro client-side navigations.
 * Persisted islands (navbar, section sidebar) survive page swaps, so a
 * `currentPath` prop captured at mount would go stale.
 */
export function useCurrentPath(initialPath: string) {
  const [path, setPath] = useState(initialPath)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    sync()
    document.addEventListener("astro:after-swap", sync)
    return () => document.removeEventListener("astro:after-swap", sync)
  }, [])

  return path
}
