import { describe, expect, test } from "bun:test"
import {
  getCurrentSearchHref,
  getSearchableSurfaces,
  getSiteNavItemByHref,
  isNavItemActive,
  isNavLinkActive,
  siteNavItems,
} from "@/features/app-shell/site-nav"
import { appSections, appSurfaces } from "@/lib/app-surfaces"

describe("isNavLinkActive", () => {
  test("home is active only on the root", () => {
    expect(isNavLinkActive("/", "/")).toBe(true)
    expect(isNavLinkActive("/", "/playbooks")).toBe(false)
  })

  test("a link is active on its route and nested routes, not on lookalikes", () => {
    expect(isNavLinkActive("/scripts", "/scripts")).toBe(true)
    expect(isNavLinkActive("/scripts", "/scripts/1/edit")).toBe(true)
    expect(isNavLinkActive("/scripts", "/scriptsx")).toBe(false)
  })
})

describe("siteNavItems", () => {
  test("has one item per section, each listing its children in order", () => {
    for (const [section, children] of Object.entries(appSections)) {
      const surface: { href: string } = Reflect.get(appSurfaces, section)
      const item = getSiteNavItemByHref(surface.href)

      const itemSection: string | undefined = item?.section
      expect(itemSection).toBe(section)
      expect(item?.subItems?.map((sub) => sub.href)).toEqual(
        children.map((child) => appSurfaces[child].href)
      )
    }
  })

  test("a section item stays active on routes it owns beyond its children", () => {
    const ansible = getSiteNavItemByHref(appSurfaces.ansible.href)
    if (!ansible) throw new Error("no ansible item")

    expect(isNavItemActive(ansible, "/jobs/123")).toBe(true)
    expect(isNavItemActive(ansible, "/scripts")).toBe(false)
  })

  test("every item is a registered surface", () => {
    const hrefs = new Set<string>(Object.values(appSurfaces).map((s) => s.href))
    for (const item of siteNavItems) expect(hrefs.has(item.href)).toBe(true)
  })
})

describe("getSearchableSurfaces", () => {
  const groups = getSearchableSurfaces()

  test("lists every registered page exactly once", () => {
    const hrefs = groups.flatMap((group) => group.items.map((i) => i.href))

    expect(hrefs.sort()).toEqual(
      Object.values(appSurfaces)
        .map((surface) => surface.href)
        .sort()
    )
  })

  test("pages outside every section come first, in the general group", () => {
    expect(groups[0]?.headingKey).toBe("search.groups.general")
    expect(groups[0]?.items.map((item) => item.href)).toContain("/config")
  })

  test("a section's children carry the section title as their trail", () => {
    const inventory = groups.find(
      (group) => group.headingKey === appSurfaces.inventory.titleKey
    )

    expect(inventory?.items[0]?.href).toBe("/inventory")
    expect(inventory?.items[0]?.trailKeys).toEqual([])
    expect(inventory?.items[1]?.trailKeys).toEqual([
      appSurfaces.inventory.titleKey,
    ])
  })
})

describe("getCurrentSearchHref", () => {
  test("picks the most specific page that matches", () => {
    expect(
      getCurrentSearchHref("/inventory/devices", [
        "/",
        "/inventory",
        "/inventory/devices",
      ])
    ).toBe("/inventory/devices")
  })

  test("nothing matching is undefined", () => {
    expect(getCurrentSearchHref("/nowhere", ["/inventory"])).toBeUndefined()
  })
})
