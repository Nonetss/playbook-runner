import { afterEach, describe, expect, mock, test } from "bun:test"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import {
  QueryState,
  type QueryStateQuery,
} from "@/components/shared/feedback/query-state"

afterEach(cleanup)

function query(
  overrides: Partial<QueryStateQuery<string[]>> = {}
): QueryStateQuery<string[]> {
  return {
    data: ["web-1", "web-2"],
    isPending: false,
    isError: false,
    refetch: () => {},
    ...overrides,
  }
}

function renderState(
  props: Partial<Parameters<typeof QueryState<string[]>>[0]> = {}
) {
  return render(
    <QueryState
      query={query()}
      isEmpty={(rows) => rows.length === 0}
      empty={{ title: "No hay dispositivos" }}
      {...props}
    >
      {(rows) => <p>{rows.join(", ")}</p>}
    </QueryState>
  )
}

describe("QueryState", () => {
  test("renders the data when there is some", () => {
    renderState()

    expect(screen.getByText("web-1, web-2")).toBeDefined()
  })

  test("a failed query offers a retry that refetches", () => {
    const refetch = mock(() => {})
    renderState({ query: query({ isError: true, refetch }) })

    expect(screen.getByText("No se pudieron cargar los datos.")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  test("an error wins over pending", () => {
    renderState({ query: query({ isError: true, isPending: true }) })

    expect(screen.getByText("No se pudieron cargar los datos.")).toBeDefined()
    expect(screen.queryByText("Cargando...")).toBeNull()
  })

  test("a pending query shows the loading state", () => {
    renderState({ query: query({ isPending: true, data: undefined }) })

    expect(screen.getByText("Cargando...")).toBeDefined()
  })

  test("no data shows the empty state", () => {
    renderState({ query: query({ data: [] }) })

    expect(screen.getByText("No hay dispositivos")).toBeDefined()
  })

  test("no data under active filters offers to clear them", () => {
    const onClear = mock(() => {})
    renderState({
      query: query({ data: [] }),
      hasActiveFilters: true,
      filteredEmpty: { onClear },
    })

    expect(screen.getByText("Sin resultados")).toBeDefined()
    expect(screen.queryByText("No hay dispositivos")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
