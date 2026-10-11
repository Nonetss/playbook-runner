import { describe, expect, test } from "bun:test"
import { foldText } from "@/lib/fold-text"

describe("foldText", () => {
  test("ignores case and accents", () => {
    expect(foldText("Configuración")).toBe(foldText("configuracion"))
    expect(foldText("ÑANDÚ")).toBe("nandu")
  })

  test("keeps everything that is not a diacritic", () => {
    expect(foldText("web-01_db.local")).toBe("web-01_db.local")
  })
})
