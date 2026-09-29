import * as React from "react"

const STORAGE_KEY = "playbooks.collapsed-sections"

function readStored(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : []
    )
  } catch {
    return new Set()
  }
}

/**
 * Collapsed folder/repository sections of the playbook browser, remembered
 * per browser. Storage failures (private mode, blocked site data) just
 * fall back to everything expanded.
 */
export function useCollapsedSections() {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(readStored)

  const toggle = React.useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // Not persisted; the in-memory state still applies.
      }
      return next
    })
  }, [])

  return { collapsed, toggle }
}
