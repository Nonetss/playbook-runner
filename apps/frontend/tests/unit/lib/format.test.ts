import { describe, expect, test } from "bun:test"
import { formatDate, formatDateTime } from "@/lib/format"

const MOMENT = "2026-03-05T14:07:00.000Z"

describe("formatDate", () => {
  test("a missing value is a dash", () => {
    expect(formatDate(null, "es")).toBe("—")
    expect(formatDate(undefined, "en")).toBe("—")
    expect(formatDate("", "es")).toBe("—")
  })

  test("formats in Spanish for es and in US English for en", () => {
    expect(formatDate(MOMENT, "es")).toBe(
      new Date(MOMENT).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    )
    expect(formatDate(new Date(MOMENT), "en-GB")).toBe("Mar 5, 2026")
  })
})

describe("formatDateTime", () => {
  test("a missing value is a dash", () => {
    expect(formatDateTime(null, "es")).toBe("—")
  })

  test("shows the day, month and time in the UI language", () => {
    const formatted = formatDateTime(MOMENT, "en")

    expect(formatted).toContain("Mar")
    expect(formatted).toContain("05")
    expect(formatted).toMatch(/02:07|14:07/)
  })
})
