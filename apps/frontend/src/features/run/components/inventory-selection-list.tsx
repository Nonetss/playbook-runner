import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")
const ChevronDown = getIcon("controls", "expand")
const Folder = getIcon("resources", "folder")
const Search = getIcon("views", "search")
const Server = getIcon("resources", "server")

import { type ElementType, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import type {
  InventoryDevice,
  InventoryGroup,
} from "@/features/inventory/types"
import { cn } from "@/lib/utils"

export type InventorySelectionLabels = {
  groups: string
  devices: string
  searchPlaceholder?: string
  noResults: string
  emptyInventory: string
  noMatch: string
}

export type InventorySelectionListProps = {
  groups: readonly InventoryGroup[]
  devices: readonly InventoryDevice[]
  selectedGroups: ReadonlySet<string>
  selectedDevices: ReadonlySet<string>
  onToggleGroup: (id: string) => void
  onToggleDevice: (id: string) => void
  labels: InventorySelectionLabels
  searchable?: boolean
  collapsible?: boolean
  disabled?: boolean
  className?: string
}

function matchesSearch(
  query: string,
  ...fields: (string | null | undefined)[]
) {
  if (!query) return true
  return fields.some((field) => field?.toLowerCase().includes(query))
}

function SelectionRow({
  name,
  description,
  icon: Icon,
  selected,
  onToggle,
  disabled,
}: {
  name: string
  description?: string | null
  icon: ElementType
  selected: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="hover:bg-accent flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input"
          )}
        >
          {selected ? <Check className="size-2.5" /> : null}
        </span>
        <Icon className="text-muted-foreground size-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-tight">
            {name}
          </span>
          {description ? (
            <span className="text-muted-foreground block truncate text-xs">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  )
}

function SelectionSection({
  title,
  items,
  selected,
  icon,
  description,
  collapsible,
  expanded,
  onToggleExpanded,
  onToggleItem,
  noResults,
  disabled,
}: {
  title: string
  items: readonly {
    id: string
    name: string
    description?: string | null
    ipAddress?: string | null
  }[]
  selected: ReadonlySet<string>
  icon: ElementType
  description: (item: {
    name: string
    description?: string | null
    ipAddress?: string | null
  }) => string | null | undefined
  collapsible: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onToggleItem: (id: string) => void
  noResults: string
  disabled: boolean
}) {
  const visibleSelectedCount = items.filter((item) =>
    selected.has(item.id)
  ).length
  const content =
    items.length > 0 ? (
      <ul className="space-y-0.5 pl-1">
        {items.map((item) => (
          <SelectionRow
            key={item.id}
            name={item.name}
            description={description(item)}
            icon={icon}
            selected={selected.has(item.id)}
            onToggle={() => onToggleItem(item.id)}
            disabled={disabled}
          />
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground px-2 py-1 text-xs">{noResults}</p>
    )

  if (!collapsible) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground px-2 text-xs font-medium uppercase tracking-wide">
          {title}
        </p>
        {content}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggleExpanded}
        disabled={disabled}
        className="hover:bg-accent flex min-h-10 w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            !expanded && "-rotate-90"
          )}
        />
        <span className="min-w-0 flex-1 text-xs font-medium">{title}</span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {visibleSelectedCount > 0 ? `${visibleSelectedCount}/` : ""}
          {items.length}
        </span>
      </button>
      {expanded ? content : null}
    </div>
  )
}

/** Shared group/device picker used by run consoles, commands, and job forms. */
export function InventorySelectionList({
  groups,
  devices,
  selectedGroups,
  selectedDevices,
  onToggleGroup,
  onToggleDevice,
  labels,
  searchable = false,
  collapsible = false,
  disabled = false,
  className,
}: InventorySelectionListProps) {
  const [search, setSearch] = useState("")
  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [devicesExpanded, setDevicesExpanded] = useState(false)
  const query = search.trim().toLowerCase()

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        matchesSearch(query, group.name, group.description)
      ),
    [groups, query]
  )
  const filteredDevices = useMemo(
    () =>
      devices.filter((device) =>
        matchesSearch(query, device.name, device.ipAddress)
      ),
    [devices, query]
  )

  if (groups.length === 0 && devices.length === 0) {
    return (
      <p className={cn("text-muted-foreground px-2 text-sm", className)}>
        {labels.emptyInventory}
      </p>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchable ? (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={labels.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={disabled}
            className="h-8 pl-8 text-xs"
          />
        </div>
      ) : null}

      {groups.length > 0 ? (
        <SelectionSection
          title={labels.groups}
          items={filteredGroups}
          selected={selectedGroups}
          icon={Folder}
          description={(group) => group.description}
          collapsible={collapsible}
          expanded={query ? true : groupsExpanded}
          onToggleExpanded={() => setGroupsExpanded((value) => !value)}
          onToggleItem={onToggleGroup}
          noResults={labels.noResults}
          disabled={disabled}
        />
      ) : null}

      {devices.length > 0 ? (
        <SelectionSection
          title={labels.devices}
          items={filteredDevices}
          selected={selectedDevices}
          icon={Server}
          description={(device) => device.ipAddress}
          collapsible={collapsible}
          expanded={query ? true : devicesExpanded}
          onToggleExpanded={() => setDevicesExpanded((value) => !value)}
          onToggleItem={onToggleDevice}
          noResults={labels.noResults}
          disabled={disabled}
        />
      ) : null}

      {searchable &&
      query &&
      filteredGroups.length === 0 &&
      filteredDevices.length === 0 ? (
        <p className="text-muted-foreground px-2 text-xs">{labels.noMatch}</p>
      ) : null}
    </div>
  )
}
