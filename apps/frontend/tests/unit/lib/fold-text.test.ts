import { describe, expect, test } from "bun:test"
import { foldText, matchesEveryWord } from "@/lib/fold-text"

describe("foldText", () => {
  test("ignores case and accents", () => {
    expect(foldText("Configuración")).toBe(foldText("configuracion"))
    expect(foldText("ÑANDÚ")).toBe("nandu")
  })

  test("keeps everything that is not a diacritic", () => {
    expect(foldText("web-01_db.local")).toBe("web-01_db.local")
  })
})

describe("matchesEveryWord", () => {
  test("an empty query matches everything", () => {
    expect(matchesEveryWord("  ", ["DB_PASS"])).toBe(true)
    expect(matchesEveryWord("", [])).toBe(true)
  })

  test("words match in any order, ignoring case and accents", () => {
    expect(matchesEveryWord("pass db", ["DB_PASS"])).toBe(true)
    expect(matchesEveryWord("configuracion", ["Configuración"])).toBe(true)
  })

  test("words may match in different texts", () => {
    expect(
      matchesEveryWord("ansible historial", ["Ansible", "Historial"])
    ).toBe(true)
  })

  test("every word has to match, as a substring", () => {
    expect(matchesEveryWord("db token", ["DB_PASS"])).toBe(false)
    expect(matchesEveryWord("dps", ["DB_PASS"])).toBe(false)
  })
})
