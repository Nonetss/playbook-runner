import { describe, expect, test } from "bun:test"
import { surfaceSearchSources } from "@/features/app-shell/model/surface-search-sources"
import { ALL_GROUP_ID } from "@/features/inventory/all-group"
import { appSurfaces } from "@/lib/app-surfaces"
import es from "@/locales/es/nav.json"

function translate(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        typeof node === "object" && node !== null
          ? Reflect.get(node, part)
          : undefined,
      es
    )
}

/** Runs a source's `select` over `rows`, as the list query would. */
function selectEntries(
  source: (typeof surfaceSearchSources)[number],
  rows: unknown
) {
  const { select } = source.queryOptions({ enabled: false })
  if (!select) throw new Error("source has no select")
  return select(rows)
}

const ROWS = [
  { id: "r1", name: "Patch", description: "Monthly" },
  { id: "r2", name: "Reboot", description: null },
]

describe("surfaceSearchSources", () => {
  test("every source lists records of a registered surface under a Spanish heading", () => {
    for (const source of surfaceSearchSources) {
      expect(appSurfaces).toHaveProperty(source.surface)
      expect(typeof translate(source.headingKey)).toBe("string")
    }
  })

  test("detail hrefs escape the record id", () => {
    for (const source of surfaceSearchSources) {
      const href = source.href("a/b c")
      expect(href).toContain("a%2Fb%20c")
      expect(href.startsWith("/")).toBe(true)
    }
  })

  test("rows become entries with the name as label and no null description", () => {
    const playbooks = surfaceSearchSources.find(
      (source) => source.surface === "playbooks"
    )
    if (!playbooks) throw new Error("no playbooks source")

    expect(selectEntries(playbooks, ROWS)).toEqual([
      { id: "r1", label: "Patch", description: "Monthly" },
      { id: "r2", label: "Reboot", description: undefined },
    ])
  })

  test("the groups source always offers the built-in All group first", () => {
    const groups = surfaceSearchSources.find(
      (source) => source.surface === "groups"
    )
    if (!groups) throw new Error("no groups source")

    const entries = selectEntries(groups, [])
    expect(entries[0]).toEqual({ id: ALL_GROUP_ID, label: "All" })
  })
})
