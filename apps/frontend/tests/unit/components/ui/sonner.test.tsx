import { afterEach, describe, expect, test } from "bun:test"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

afterEach(() => {
  act(() => {
    toast.dismiss()
  })
  cleanup()
})

const kinds = [
  ["success", () => toast.success("Hecho")],
  ["error", () => toast.error("Falló")],
  ["info", () => toast.info("Aviso")],
  ["warning", () => toast.warning("Cuidado")],
  ["loading", () => toast.loading("Cargando")],
] as const

describe("Toaster", () => {
  for (const [type, show] of kinds) {
    test(`a ${type} toast carries its state icon from the icon registry`, async () => {
      const { container } = render(<Toaster />)

      act(() => {
        show()
      })

      await waitFor(() => {
        const item = container.querySelector(
          `[data-sonner-toast][data-type="${type}"]`
        )
        expect(item).not.toBeNull()
        // Lucide icons from the app's registry, not Sonner's built-in set.
        const icon = item?.querySelector("[data-icon] svg")
        expect(icon?.classList.contains("lucide")).toBe(true)
      })
    })
  }

  test("the loading toast's icon spins", async () => {
    const { container } = render(<Toaster />)

    act(() => {
      toast.loading("Cargando")
    })

    await waitFor(() => {
      const icon = container.querySelector(
        '[data-sonner-toast][data-type="loading"] [data-icon] svg'
      )
      expect(icon?.getAttribute("class")).toContain("animate-spin")
    })
  })
})
