export type ViewState<TExtra> = { scrollY: number } & TExtra

/**
 * Generic session-storage view-state persistence: a scroll position plus
 * whatever extra per-page state (expanded ids, visible row count, filter
 * panel state...) the caller wants to restore alongside it.
 */
export function createViewState<TExtra extends object>(
  storageKey: string,
  parseExtra: (raw: Record<string, unknown>) => TExtra
) {
  function read(): ViewState<TExtra> | null {
    if (typeof window === "undefined") return null
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const scrollY = typeof parsed.scrollY === "number" ? parsed.scrollY : 0
      return { scrollY, ...parseExtra(parsed) }
    } catch {
      return null
    }
  }

  function write(state: ViewState<TExtra>): void {
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }

  function save(scrollY: number, extra: TExtra): void {
    write({ scrollY, ...extra })
  }

  return { read, write, save }
}

/** For pages that only need to restore scroll position, with no extra state. */
export function createSimpleViewState(storageKey: string) {
  return createViewState<Record<string, never>>(storageKey, () => ({}))
}
