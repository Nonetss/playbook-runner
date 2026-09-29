import type { Dispatch, SetStateAction } from "react"

/** Returns a toggler that adds or removes `id` from a `Set` state. */
export function toggleIn(setter: Dispatch<SetStateAction<Set<string>>>) {
  return (id: string) =>
    setter((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
}
