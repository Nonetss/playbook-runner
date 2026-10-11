import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"

afterEach(cleanup)

const OPTIONS = [
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python", shortLabel: "Py" },
] as const

describe("SegmentedPicker", () => {
  test("marks only the selected option as checked", () => {
    render(
      <SegmentedPicker
        value="python"
        onChange={() => {}}
        options={OPTIONS}
        ariaLabel="Lenguaje"
      />
    )

    expect(screen.getByRole("radiogroup", { name: "Lenguaje" })).toBeDefined()
    expect(
      screen.getByRole("radio", { name: /Python/ }).getAttribute("aria-checked")
    ).toBe("true")
    expect(
      screen.getByRole("radio", { name: "Bash" }).getAttribute("aria-checked")
    ).toBe("false")
  })

  test("reports the option the user picks", () => {
    const onChange = mock((_: string) => {})
    render(
      <SegmentedPicker value="bash" onChange={onChange} options={OPTIONS} />
    )

    fireEvent.click(screen.getByRole("radio", { name: /Python/ }))

    expect(onChange).toHaveBeenCalledWith("python")
  })

  test("a disabled picker reports nothing", () => {
    const onChange = mock((_: string) => {})
    render(
      <SegmentedPicker
        value="bash"
        onChange={onChange}
        options={OPTIONS}
        disabled
      />
    )

    fireEvent.click(screen.getByRole("radio", { name: /Python/ }))

    expect(onChange).not.toHaveBeenCalled()
  })

  test("an option with a short label keeps its full label for assistive tech", () => {
    render(
      <SegmentedPicker value="bash" onChange={() => {}} options={OPTIONS} />
    )

    expect(screen.getByRole("radio", { name: /Python/ }).textContent).toBe(
      "PyPython"
    )
  })
})
