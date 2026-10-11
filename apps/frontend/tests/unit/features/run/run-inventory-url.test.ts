import { beforeEach, describe, expect, test } from "bun:test"
import {
  buildRunInventorySearch,
  parseRunInventorySearch,
  readRunInventoryFromUrl,
  syncRunInventoryToUrl,
} from "@/features/run/lib/run-inventory-url"

beforeEach(() => window.history.replaceState(null, "", "/playbooks/p1/run"))

describe("buildRunInventorySearch / parseRunInventorySearch", () => {
  test("a selection survives the round trip", () => {
    const search = buildRunInventorySearch(["g1", "all"], ["d1", "d2"])

    expect(parseRunInventorySearch(search)).toEqual({
      groups: ["g1", "all"],
      devices: ["d1", "d2"],
    })
  })

  test("an empty selection is an empty query", () => {
    expect(buildRunInventorySearch([], [])).toBe("")
    expect(parseRunInventorySearch("")).toEqual({ groups: [], devices: [] })
  })

  test("only the non-empty keys are written", () => {
    expect(buildRunInventorySearch([], ["d1"])).toBe("?devices=d1")
  })

  test("parsing tolerates a missing question mark and empty items", () => {
    expect(parseRunInventorySearch("groups=g1,,g2&other=1")).toEqual({
      groups: ["g1", "g2"],
      devices: [],
    })
  })
})

describe("syncRunInventoryToUrl / readRunInventoryFromUrl", () => {
  test("writes the selection into the current URL, keeping path and hash", () => {
    window.history.replaceState(null, "", "/playbooks/p1/run#console")

    syncRunInventoryToUrl(new Set(["g1"]), new Set(["d1"]))

    expect(window.location.pathname).toBe("/playbooks/p1/run")
    expect(window.location.hash).toBe("#console")
    expect(readRunInventoryFromUrl()).toEqual({
      groups: ["g1"],
      devices: ["d1"],
    })
  })

  test("clearing the selection clears the query", () => {
    syncRunInventoryToUrl(new Set(["g1"]), new Set())
    syncRunInventoryToUrl(new Set(), new Set())

    expect(window.location.search).toBe("")
  })
})
