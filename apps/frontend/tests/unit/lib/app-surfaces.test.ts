import { describe, expect, test } from "bun:test"
import { appSections, appSurfaces, getSectionForPath } from "@/lib/app-surfaces"
import es from "@/locales/es/nav.json"

/** Reads a dotted key (`links.home`) out of the Spanish `nav` namespace. */
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

describe("appSurfaces", () => {
  test("every surface has a Spanish title and description", () => {
    for (const surface of Object.values(appSurfaces)) {
      expect(typeof translate(surface.titleKey)).toBe("string")
      expect(typeof translate(surface.descriptionKey)).toBe("string")
    }
  })

  test("hrefs are unique", () => {
    const hrefs = Object.values(appSurfaces).map((surface) => surface.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  test("every section and child is a registered surface", () => {
    for (const [section, children] of Object.entries(appSections)) {
      expect(appSurfaces).toHaveProperty(section)
      for (const child of children) expect(appSurfaces).toHaveProperty(child)
    }
  })
})

describe("getSectionForPath", () => {
  const cases: [string, string | undefined][] = [
    ["/inventory", "inventory"],
    ["/inventory/devices", "inventory"],
    ["/inventory/123/group", "inventory"],
    ["/playbooks/123/run", "ansible"],
    ["/jobs/123/edit", "ansible"],
    ["/jobs/new", "ansible"],
    ["/scripts/new", "bash"],
    ["/commands", "bash"],
    ["/config", undefined],
    ["/", undefined],
    ["/inventoryx", undefined],
  ]

  for (const [pathname, section] of cases) {
    test(`${pathname} belongs to ${section ?? "no section"}`, () => {
      const actual: string | undefined = getSectionForPath(pathname)
      expect(actual).toBe(section)
    })
  }

  test("a section's own overview belongs to it", () => {
    for (const section of Object.keys(appSections)) {
      const surface: { href: string } = Reflect.get(appSurfaces, section)
      const actual: string | undefined = getSectionForPath(surface.href)
      expect(actual).toBe(section)
    }
  })
})
