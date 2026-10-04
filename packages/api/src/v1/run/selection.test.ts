import { describe, expect, test } from "bun:test"
import { jobsInput } from "#v1/jobs/input"
import { jobsOutput } from "#v1/jobs/output"
import { runInput } from "#v1/run/input"
import { splitSelection } from "#v1/run/selection"

const groupId = "11111111-1111-4111-8111-111111111111"
const deviceId = "22222222-2222-4222-8222-222222222222"
const playbookId = "33333333-3333-4333-8333-333333333333"

const runWith = (inventory: unknown) =>
  runInput.run.safeParse({ playbookId, inventory })

describe("inventory selection input", () => {
  test("accepts the All entry", () => {
    const result = runWith([{ type: "all" }])
    expect(result.success).toBe(true)
    expect(result.data?.inventory).toEqual([{ type: "all" }])
  })

  test("strips an id sent with the All entry", () => {
    const result = runWith([{ type: "all", id: groupId }])
    expect(result.success).toBe(true)
    expect(result.data?.inventory).toEqual([{ type: "all" }])
  })

  test("accepts group and device entries with ids", () => {
    const result = runWith([
      { type: "group", id: groupId },
      { type: "device", id: deviceId },
    ])
    expect(result.success).toBe(true)
  })

  test.each([
    [{ type: "group" }],
    [{ type: "device" }],
    [{ type: "group", id: "not-a-uuid" }],
    [{ type: "everything" }],
  ])("rejects %p", (entry) => {
    expect(runWith([entry]).success).toBe(false)
  })

  test("commands and scripts accept the All entry", () => {
    expect(
      runInput.command.safeParse({
        inventory: [{ type: "all" }],
        command: "uptime",
      }).success
    ).toBe(true)
    expect(
      runInput.script.safeParse({
        scriptId: playbookId,
        inventory: [{ type: "all" }],
      }).success
    ).toBe(true)
  })
})

describe("job inventory", () => {
  test("round-trips the All entry through input and output", () => {
    const input = jobsInput.create.parse({
      name: "fleet",
      inventoryJson: [{ type: "all" }],
      cronExpression: null,
    })
    expect(input.inventoryJson).toEqual([{ type: "all" }])

    const output = jobsOutput.get.parse({
      id: "job",
      name: "fleet",
      description: null,
      playbookId: null,
      inventoryJson: input.inventoryJson,
      extravarsJson: null,
      forks: 1,
      cronExpression: null,
      enabled: true,
      createdAt: null,
      updatedAt: null,
    })
    expect(output.inventoryJson).toEqual([{ type: "all" }])
  })
})

describe("splitSelection", () => {
  test("all-only selection", () => {
    expect(splitSelection([{ type: "all" }])).toEqual({
      all: true,
      deviceIds: [],
      groupIds: [],
    })
  })

  test("mixed selection", () => {
    expect(
      splitSelection([
        { type: "group", id: groupId },
        { type: "all" },
        { type: "device", id: deviceId },
      ])
    ).toEqual({ all: true, deviceIds: [deviceId], groupIds: [groupId] })
  })

  test("group and device selection without All", () => {
    expect(
      splitSelection([
        { type: "device", id: deviceId },
        { type: "group", id: groupId },
      ])
    ).toEqual({ all: false, deviceIds: [deviceId], groupIds: [groupId] })
  })
})
