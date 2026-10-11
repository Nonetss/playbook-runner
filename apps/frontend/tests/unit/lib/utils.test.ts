import { describe, expect, test } from "bun:test"
import { cn } from "@/lib/utils"

describe("cn", () => {
  test("joins conditional classes", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c")
  })

  test("a later Tailwind utility wins over a conflicting one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  test("a typography role and a text tone are kept together", () => {
    expect(cn("text-meta", "text-muted-foreground")).toBe(
      "text-meta text-muted-foreground"
    )
  })

  test("a typography role replaces a default font size", () => {
    expect(cn("text-sm", "text-meta")).toBe("text-meta")
  })
})
