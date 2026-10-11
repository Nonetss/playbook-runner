import { describe, expect, test } from "bun:test"
import { ALL_GROUP_ID } from "@/features/inventory/all-group"
import {
  coveredDevices,
  fromRunSelection,
  toRunSelection,
} from "@/features/run/lib/run-selection"

describe("toRunSelection", () => {
  test("groups come before devices, and the All sentinel becomes type all", () => {
    expect(toRunSelection(["g1", ALL_GROUP_ID], new Set(["d1"]))).toEqual([
      { id: "g1", type: "group" },
      { type: "all" },
      { id: "d1", type: "device" },
    ])
  })

  test("an empty picker is an empty selection", () => {
    expect(toRunSelection([], [])).toEqual([])
  })
})

describe("fromRunSelection", () => {
  test("is the inverse of toRunSelection", () => {
    const groups = new Set(["g1", ALL_GROUP_ID])
    const devices = new Set(["d1", "d2"])

    expect(fromRunSelection(toRunSelection(groups, devices))).toEqual({
      groups,
      devices,
    })
  })

  test("a missing selection is empty", () => {
    expect(fromRunSelection(null)).toEqual({
      groups: new Set(),
      devices: new Set(),
    })
  })
})

describe("coveredDevices", () => {
  const groups = [{ id: "web" }, { id: "db" }, { id: ALL_GROUP_ID }]
  const devices = [{ id: "d1" }, { id: "d2" }, { id: "d3" }]
  const relations = [
    { deviceId: "d1", groupId: "web" },
    { deviceId: "d2", groupId: "web" },
    { deviceId: "d2", groupId: "db" },
    { deviceId: "ghost", groupId: "web" },
  ]

  test("nothing is covered when no group is selected", () => {
    expect(coveredDevices(new Set(), groups, devices, relations).size).toBe(0)
  })

  test("maps each covered device to the selected groups covering it, in group order", () => {
    const covered = coveredDevices(
      new Set(["db", "web"]),
      groups,
      devices,
      relations
    )

    expect(Object.fromEntries(covered)).toEqual({
      d1: ["web"],
      d2: ["web", "db"],
    })
  })

  test("the All group covers every listed device", () => {
    const covered = coveredDevices(
      new Set([ALL_GROUP_ID]),
      groups,
      devices,
      relations
    )

    expect([...covered.keys()].sort()).toEqual(["d1", "d2", "d3"])
  })

  test("relations to devices that are not listed are ignored", () => {
    const covered = coveredDevices(new Set(["web"]), groups, devices, relations)

    expect(covered.has("ghost")).toBe(false)
  })
})
