import { useState } from "react"

/**
 * Runs `seed` exactly on the `false -> true` transition of `open`.
 *
 * Form dialogs need to load their fields from an `entity` prop when they
 * open. Doing that in an effect keyed on `[open, entity]` misfires, because
 * `entity` is usually a live query object: any background refetch gives it a
 * new reference even while the dialog stays open, re-running the effect and
 * silently discarding whatever the user has typed.
 *
 * This adjusts state during render instead of after commit, so the reseeded
 * values are painted in the same pass rather than flashing the previous ones.
 * `seed` may call the component's own `setState` functions freely.
 */
export function useOnOpen(open: boolean, seed: () => void) {
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) seed()
  }
}
