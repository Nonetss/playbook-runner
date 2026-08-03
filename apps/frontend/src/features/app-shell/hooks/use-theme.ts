import * as React from "react"

type Theme = "light" | "dark"

function readTheme(): Theme {
  if (typeof document === "undefined") return "light"
  if (document.documentElement.classList.contains("dark")) return "dark"
  const stored = localStorage.getItem("theme")
  return stored === "dark" ? "dark" : "light"
}

/**
 * Returns the active theme ("light" | "dark") and re-renders when the user
 * toggles it (via `dark` class on `<html>`). Mirrors the toggle implemented
 * in `theme-toggle.tsx`.
 */
export function useTheme(): { theme: Theme } {
  const [theme, setTheme] = React.useState<Theme>("light")

  React.useEffect(() => {
    setTheme(readTheme())
    const observer = new MutationObserver(() => {
      setTheme(readTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  return { theme }
}
