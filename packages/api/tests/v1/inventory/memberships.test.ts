import { beforeEach, describe, expect, test } from "bun:test"
import { deviceGroupRow, IDS, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { inventoryDeviceGroupHandler } from "#v1/inventory/handler"

const context = userContext()
const MEMBERSHIP = { deviceId: IDS.device, groupId: IDS.group }

beforeEach(() => fakeDb.reset())

describe("inventory.deviceGroups.assign", () => {
  test("inserts the membership and returns it", async () => {
    fakeDb.queue("insert", [deviceGroupRow()])

    expect(
      await inventoryDeviceGroupHandler.assign({ context, input: MEMBERSHIP })
    ).toEqual(deviceGroupRow())
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([MEMBERSHIP])
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      inventoryDeviceGroupHandler.assign({ context, input: MEMBERSHIP }),
      "INTERNAL_SERVER_ERROR"
    )
  })
})

describe("inventory.deviceGroups.list", () => {
  test("returns every membership", async () => {
    fakeDb.queue("select", [deviceGroupRow()])

    expect(await inventoryDeviceGroupHandler.list({ context })).toEqual([
      deviceGroupRow(),
    ])
  })
})

describe("inventory.deviceGroups.listByDevice", () => {
  test("returns the device's memberships", async () => {
    fakeDb.queue("select", [deviceGroupRow()])

    expect(
      await inventoryDeviceGroupHandler.listByDevice({
        context,
        input: { deviceId: IDS.device },
      })
    ).toEqual([deviceGroupRow()])
  })
})

describe("inventory.deviceGroups.listByGroup", () => {
  test("returns the group's memberships, empty when it has none", async () => {
    fakeDb.queue("select", [])

    expect(
      await inventoryDeviceGroupHandler.listByGroup({
        context,
        input: { groupId: IDS.group },
      })
    ).toEqual([])
  })
})

describe("inventory.deviceGroups.unassign", () => {
  test("returns the removed membership", async () => {
    fakeDb.queue("delete", [deviceGroupRow()])

    expect(
      await inventoryDeviceGroupHandler.unassign({
        context,
        input: MEMBERSHIP,
      })
    ).toEqual(deviceGroupRow())
  })

  test("a device that is not in the group is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      inventoryDeviceGroupHandler.unassign({ context, input: MEMBERSHIP }),
      "NOT_FOUND"
    )
  })
})
