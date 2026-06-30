"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * `true` only after the React tree has hydrated on the client.
 *
 * Uses `useSyncExternalStore` so the server and the client's first paint
 * both see `false`, avoiding mismatches when TanStack Query reads a warm
 * browser cache populated by another island or navbar prefetch.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
