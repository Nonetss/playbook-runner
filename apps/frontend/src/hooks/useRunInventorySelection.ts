import { useEffect, useState } from "react"
import {
  readRunInventoryFromUrl,
  syncRunInventoryToUrl,
} from "@/lib/run-inventory-url"

type UseRunInventorySelectionOptions = {
  groups: readonly { id: string }[]
  devices: readonly { id: string }[]
  ready: boolean
}

export function useRunInventorySelection({
  groups,
  devices,
  ready,
}: UseRunInventorySelectionOptions) {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(readRunInventoryFromUrl().groups)
  )
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(
    () => new Set(readRunInventoryFromUrl().devices)
  )

  useEffect(() => {
    function syncFromUrl() {
      const parsed = readRunInventoryFromUrl()
      setSelectedGroups(new Set(parsed.groups))
      setSelectedDevices(new Set(parsed.devices))
    }

    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  useEffect(() => {
    if (!ready) return

    const validGroupIds = new Set(groups.map((group) => group.id))
    const validDeviceIds = new Set(devices.map((device) => device.id))

    setSelectedGroups((prev) => {
      const next = new Set([...prev].filter((id) => validGroupIds.has(id)))
      return next.size === prev.size ? prev : next
    })
    setSelectedDevices((prev) => {
      const next = new Set([...prev].filter((id) => validDeviceIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [ready, groups, devices])

  useEffect(() => {
    if (!ready) return
    syncRunInventoryToUrl(selectedGroups, selectedDevices)
  }, [ready, selectedGroups, selectedDevices])

  return {
    selectedGroups,
    setSelectedGroups,
    selectedDevices,
    setSelectedDevices,
  }
}
