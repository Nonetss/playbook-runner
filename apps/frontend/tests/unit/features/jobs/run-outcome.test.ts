import { describe, expect, test } from "bun:test"
import {
  RUN_OUTCOME_TONE,
  runOutcome,
} from "@/features/jobs/components/run-widgets"

describe("runOutcome", () => {
  test("a failed run with hosts on both sides is partial", () => {
    expect(runOutcome({ status: "failed", hostsOk: 2, hostsFailed: 1 })).toBe(
      "partial"
    )
  })

  test("a cancelled run stays cancelled whatever its hosts did", () => {
    expect(
      runOutcome({ status: "cancelled", hostsOk: 2, hostsFailed: 1 })
    ).toBe("cancelled")
  })

  test("a cancelled run is not shown as destructive", () => {
    expect(RUN_OUTCOME_TONE.cancelled).toBe("muted")
  })
})
