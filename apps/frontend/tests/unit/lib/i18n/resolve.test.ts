import { describe, expect, test } from "bun:test"
import { resolveLocaleFromHeaders } from "@/lib/i18n/resolve"

describe("resolveLocaleFromHeaders", () => {
  test("the locale cookie wins", () => {
    expect(resolveLocaleFromHeaders("theme=dark; locale=en", "es-ES")).toBe(
      "en"
    )
  })

  test("an unsupported cookie falls back to Accept-Language", () => {
    expect(resolveLocaleFromHeaders("locale=fr", "en-US,en;q=0.9")).toBe("en")
  })

  test("Accept-Language is read by preference weight", () => {
    expect(resolveLocaleFromHeaders(null, "fr;q=1,en;q=0.5,es;q=0.8")).toBe(
      "es"
    )
  })

  test("a regional tag matches its language", () => {
    expect(resolveLocaleFromHeaders(null, "es-MX")).toBe("es")
  })

  test("nothing usable falls back to Spanish", () => {
    expect(resolveLocaleFromHeaders(null, null)).toBe("es")
    expect(resolveLocaleFromHeaders("", "fr-FR,de")).toBe("es")
  })
})
