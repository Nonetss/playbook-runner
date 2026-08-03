const GROUPS_KEY = "groups"
const DEVICES_KEY = "devices"

export type RunInventoryUrlSelection = {
  groups: string[]
  devices: string[]
}

export function parseRunInventorySearch(
  search: string
): RunInventoryUrlSelection {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )

  return {
    groups: params.get(GROUPS_KEY)?.split(",").filter(Boolean) ?? [],
    devices: params.get(DEVICES_KEY)?.split(",").filter(Boolean) ?? [],
  }
}

export function buildRunInventorySearch(
  groups: Iterable<string>,
  devices: Iterable<string>
): string {
  const groupIds = [...groups]
  const deviceIds = [...devices]
  const params = new URLSearchParams()

  if (groupIds.length > 0) params.set(GROUPS_KEY, groupIds.join(","))
  if (deviceIds.length > 0) params.set(DEVICES_KEY, deviceIds.join(","))

  const query = params.toString()
  return query ? `?${query}` : ""
}

export function syncRunInventoryToUrl(
  groups: Set<string>,
  devices: Set<string>
) {
  const search = buildRunInventorySearch(groups, devices)
  const nextUrl = `${window.location.pathname}${search}${window.location.hash}`
  window.history.replaceState(window.history.state, "", nextUrl)
}

export function readRunInventoryFromUrl(): RunInventoryUrlSelection {
  return parseRunInventorySearch(window.location.search)
}
