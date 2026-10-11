import { describe, expect, test } from "bun:test"
import { getIcon, iconRegistry } from "@/lib/icon-registry"

describe("iconRegistry", () => {
  test("every entry is a renderable icon component", () => {
    for (const group of Object.values(iconRegistry)) {
      for (const icon of Object.values(group)) {
        expect(icon).toBeDefined()
        expect(["function", "object"]).toContain(typeof icon)
      }
    }
  })
})

describe("getIcon", () => {
  test("returns the registered icon of a group", () => {
    expect(getIcon("theme", "dark")).toBe(iconRegistry.theme.dark)
  })
})
