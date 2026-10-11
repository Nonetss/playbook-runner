import { afterEach, describe, expect, mock, test } from "bun:test"
import { astroNavigate } from "@test/unit/fixtures/astro"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import {
  EntityCardGrid,
  EntityList,
  type EntityListDefinition,
} from "@/components/shared/resource/entity-list"

afterEach(cleanup)

type Device = { id: string; name: string; address: string; online: boolean }
type Context = { addressLabel: string }

const DEVICES: Device[] = [
  { id: "d1", name: "web-1", address: "10.0.0.1", online: true },
  { id: "d2", name: "db-1", address: "10.0.0.2", online: false },
]
const CONTEXT: Context = { addressLabel: "Dirección" }

function definition(
  overrides: Partial<EntityListDefinition<Device, Context>> = {}
): EntityListDefinition<Device, Context> {
  return {
    getKey: (device) => device.id,
    getPrimary: (device) => device.name,
    getStatus: (device) =>
      device.online
        ? { tone: "primary", label: "En línea" }
        : { tone: "muted", label: "Sin conexión" },
    metadata: [
      {
        key: "address",
        label: (context) => context.addressLabel,
        value: (device) => device.address,
      },
    ],
    ...overrides,
  }
}

/** Opens a row's action menu through its trigger. */
function openActions(name: string) {
  fireEvent.keyDown(
    screen.getByRole("button", { name: `Acciones para ${name}` }),
    { key: "Enter" }
  )
}

for (const [name, View] of [
  ["EntityList", EntityList],
  ["EntityCardGrid", EntityCardGrid],
] as const) {
  describe(name, () => {
    test("renders one item per row with its status word and metadata", () => {
      render(
        <View items={DEVICES} context={CONTEXT} definition={definition()} />
      )

      const items = screen.getAllByRole("listitem")
      expect(items).toHaveLength(2)
      const first = within(items[0] ?? document.body)
      expect(first.getByText("web-1")).toBeDefined()
      expect(first.getByText("En línea")).toBeDefined()
      expect(first.getByText("Dirección")).toBeDefined()
      expect(first.getByText("10.0.0.1")).toBeDefined()
      expect(
        within(items[1] ?? document.body).getByText("Sin conexión")
      ).toBeDefined()
    })

    test("opening an item passes it and the context to onOpen", () => {
      const onOpen = mock((_: Device, __: Context) => {})
      render(
        <View
          items={DEVICES}
          context={CONTEXT}
          definition={definition({ onOpen })}
        />
      )

      fireEvent.click(screen.getByRole("button", { name: "db-1" }))

      expect(onOpen).toHaveBeenCalledWith(DEVICES[1], CONTEXT)
    })

    test("an item with an open href is a link that navigates client-side", () => {
      astroNavigate.mockClear()
      render(
        <View
          items={DEVICES}
          context={CONTEXT}
          definition={definition({
            getOpenHref: (device) => `/inventory/devices/${device.id}`,
          })}
        />
      )

      const link = screen.getByRole("link", { name: "web-1" })
      expect(link.getAttribute("href")).toBe("/inventory/devices/d1")
      fireEvent.click(link)
      expect(astroNavigate).toHaveBeenCalledWith("/inventory/devices/d1")
    })

    test("hidden metadata and actions are left out for that item", () => {
      render(
        <View
          items={DEVICES}
          context={CONTEXT}
          definition={definition({
            metadata: [
              {
                key: "address",
                label: "Dirección",
                value: (device) => device.address,
                hidden: (device) => !device.online,
              },
            ],
            actions: [
              {
                key: "ping",
                label: "Ping",
                onSelect: () => {},
                hidden: (device) => !device.online,
              },
            ],
          })}
        />
      )

      expect(screen.queryByText("10.0.0.2")).toBeNull()
      expect(screen.getByRole("button", { name: "Acciones para web-1" }))
      expect(
        screen.queryByRole("button", { name: "Acciones para db-1" })
      ).toBeNull()
    })

    test("an action runs with its item and context", async () => {
      const onDelete = mock((_: Device, __: Context) => {})
      render(
        <View
          items={DEVICES}
          context={CONTEXT}
          definition={definition({
            actions: [
              {
                key: "delete",
                label: (device) => `Eliminar ${device.name}`,
                destructive: true,
                onSelect: onDelete,
              },
            ],
          })}
        />
      )

      openActions("db-1")
      fireEvent.click(
        await screen.findByRole("menuitem", { name: "Eliminar db-1" })
      )

      expect(onDelete).toHaveBeenCalledWith(DEVICES[1], CONTEXT)
    })
  })
}
