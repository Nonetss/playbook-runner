import { beforeEach, describe, expect, test } from "bun:test"
import { call } from "@orpc/server"
import { deviceRow, IDS, stepArgs } from "@playbook-runner/db/testing"
import { userContext } from "#tests/fixtures/context"
import { fakeDb } from "#tests/fixtures/db"
import { expectErrorCode } from "#tests/fixtures/errors"
import { inventoryDeviceHandler } from "#v1/inventory/handler"
import { inventoryRouter } from "#v1/inventory/router"

const context = userContext()
const DEVICE = {
  name: "web-1",
  ipAddress: "10.0.0.10",
  portSSH: 22,
  credentialId: IDS.credential,
}

beforeEach(() => fakeDb.reset())

describe("inventory.devices.create", () => {
  test("inserts the device and returns it", async () => {
    const row = deviceRow()
    fakeDb.queue("insert", [row])

    expect(
      await inventoryDeviceHandler.create({ context, input: DEVICE })
    ).toEqual(row)
    const [insert] = fakeDb.calls("insert")
    if (!insert) throw new Error("no insert recorded")
    expect(stepArgs(insert, "values")).toEqual([DEVICE])
  })

  test("an insert that returns nothing is INTERNAL_SERVER_ERROR", async () => {
    fakeDb.queue("insert", [])

    await expectErrorCode(
      inventoryDeviceHandler.create({ context, input: DEVICE }),
      "INTERNAL_SERVER_ERROR"
    )
  })

  test("an unsafe name is BAD_REQUEST and nothing is written", async () => {
    await expectErrorCode(
      call(
        inventoryRouter.devices.create,
        { ...DEVICE, name: "../etc" },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })

  test("an address that is not an IP or CIDR is BAD_REQUEST", async () => {
    await expectErrorCode(
      call(
        inventoryRouter.devices.create,
        { ...DEVICE, ipAddress: "web.example.com" },
        { context }
      ),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("inventory.devices.list", () => {
  test("returns every device", async () => {
    const rows = [deviceRow()]
    fakeDb.queue("select", rows)

    expect(await inventoryDeviceHandler.list({ context })).toEqual(rows)
  })
})

describe("inventory.devices.get", () => {
  test("returns the device", async () => {
    fakeDb.queue("select", [deviceRow()])

    expect(
      await inventoryDeviceHandler.get({ context, input: { id: IDS.device } })
    ).toEqual(deviceRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("select", [])

    await expectErrorCode(
      inventoryDeviceHandler.get({ context, input: { id: IDS.device } }),
      "NOT_FOUND"
    )
  })

  test("a malformed id is BAD_REQUEST before any query", async () => {
    await expectErrorCode(
      call(inventoryRouter.devices.get, { id: "not-a-uuid" }, { context }),
      "BAD_REQUEST"
    )
    expect(fakeDb.calls()).toEqual([])
  })
})

describe("inventory.devices.update", () => {
  test("writes the new values and updatedAt, never the id", async () => {
    fakeDb.queue("update", [deviceRow({ portSSH: 2222 })])

    await inventoryDeviceHandler.update({
      context,
      input: { ...DEVICE, id: IDS.device, portSSH: 2222 },
    })

    const [update] = fakeDb.calls("update")
    if (!update) throw new Error("no update recorded")
    const [values] = stepArgs(update, "set")
    expect(values).toMatchObject({ ...DEVICE, portSSH: 2222 })
    expect(values).toHaveProperty("updatedAt", expect.any(Date))
    expect(values).not.toHaveProperty("id")
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("update", [])

    await expectErrorCode(
      inventoryDeviceHandler.update({
        context,
        input: { ...DEVICE, id: IDS.device },
      }),
      "NOT_FOUND"
    )
  })
})

describe("inventory.devices.delete", () => {
  test("returns the deleted device", async () => {
    fakeDb.queue("delete", [deviceRow()])

    expect(
      await inventoryDeviceHandler.delete({
        context,
        input: { id: IDS.device },
      })
    ).toEqual(deviceRow())
  })

  test("an unknown id is NOT_FOUND", async () => {
    fakeDb.queue("delete", [])

    await expectErrorCode(
      inventoryDeviceHandler.delete({ context, input: { id: IDS.device } }),
      "NOT_FOUND"
    )
  })
})
