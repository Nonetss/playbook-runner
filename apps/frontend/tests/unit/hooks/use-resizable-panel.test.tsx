import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { PanelResizeHandle } from "@/components/shared/layout/panel-resize-handle"
import { useResizablePanel } from "@/hooks/use-resizable-panel"

const KEY = "panel-width:test"

function Panel() {
  const { panelStyle, handleProps } = useResizablePanel({
    storageKey: "test",
    defaultWidth: 288,
  })
  return (
    <main>
      <aside aria-label="Panel" style={panelStyle}>
        <PanelResizeHandle {...handleProps} />
      </aside>
    </main>
  )
}

/** The container is 1000 wide and the panel ends at its right edge. */
function layOut() {
  spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 1000,
    right: 1000,
  } as DOMRect)
}

const widthOf = () =>
  screen.getByLabelText("Panel").style.getPropertyValue("--panel-width")

const handle = () => screen.getByRole("separator")

function drag(toX: number) {
  fireEvent.pointerDown(handle(), { pointerId: 1 })
  fireEvent.pointerMove(handle(), { pointerId: 1, clientX: toX })
  fireEvent.pointerUp(handle(), { pointerId: 1 })
}

beforeEach(() => {
  localStorage.clear()
  layOut()
})

afterEach(() => {
  cleanup()
  mock.restore()
})

describe("useResizablePanel", () => {
  test("starts at the default width", () => {
    render(<Panel />)
    expect(widthOf()).toBe("288px")
  })

  test("dragging follows the pointer and is remembered", () => {
    render(<Panel />)
    drag(600)
    expect(widthOf()).toBe("400px")
    expect(localStorage.getItem(KEY)).toBe("400")
  })

  test("moving without dragging changes nothing", () => {
    render(<Panel />)
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 600 })
    expect(widthOf()).toBe("288px")
  })

  test("stops at the default width and at half of the container", () => {
    render(<Panel />)
    drag(900)
    expect(widthOf()).toBe("288px")
    drag(100)
    expect(widthOf()).toBe("500px")
  })

  test("starts at the remembered width", () => {
    localStorage.setItem(KEY, "420")
    render(<Panel />)
    expect(widthOf()).toBe("420px")
  })

  test("a malformed or too small stored width falls back to the default", () => {
    localStorage.setItem(KEY, "ancho")
    render(<Panel />)
    expect(widthOf()).toBe("288px")
    cleanup()

    localStorage.setItem(KEY, "40")
    render(<Panel />)
    expect(widthOf()).toBe("288px")
  })

  test("the arrows resize it and are remembered", () => {
    render(<Panel />)
    fireEvent.keyDown(handle(), { key: "ArrowLeft" })
    expect(widthOf()).toBe("304px")
    expect(localStorage.getItem(KEY)).toBe("304")

    fireEvent.keyDown(handle(), { key: "ArrowRight" })
    expect(widthOf()).toBe("288px")
  })

  test("a double click goes back to the default and forgets it", () => {
    localStorage.setItem(KEY, "420")
    render(<Panel />)
    fireEvent.doubleClick(handle())
    expect(widthOf()).toBe("288px")
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  test("still resizes when the browser refuses to store it", () => {
    spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied")
    })
    render(<Panel />)
    drag(600)
    expect(widthOf()).toBe("400px")
  })

  test("names the handle", () => {
    render(<Panel />)
    expect(
      screen.getByRole("separator", { name: "Cambiar el ancho del panel" })
    ).toBeTruthy()
  })
})
