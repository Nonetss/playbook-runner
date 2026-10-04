import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { textVariants } from "@/components/shared/brand/typography"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { SurfaceSearchLabel } from "@/features/app-shell/components/surface-search-label"
import { useSurfaceSearchRecords } from "@/features/app-shell/hooks/use-surface-search-records"
import type {
  SurfaceSearchResult,
  SurfaceSearchResultGroup,
} from "@/features/app-shell/model/surface-search-sources"
import {
  getCurrentSearchHref,
  getSearchableSurfaces,
} from "@/features/app-shell/site-nav"
import { foldText } from "@/lib/fold-text"
import { navigate } from "@/lib/navigate"
import { readRecentSurfaces, recordRecentSurface } from "@/lib/recent-surfaces"

export interface SurfaceSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
  /** Scopes the recently visited list stored in `localStorage`. */
  userId: string
}

const RECENT_PREFIX = "recent:"

/**
 * Every word of the query must be a substring of one of the item's folded
 * keywords (label, description, section, trail), so "ansible historial"
 * finds the run history. The score stays binary so cmdk keeps the render
 * order.
 */
function matchSurface(_value: string, search: string, keywords?: string[]) {
  const words = foldText(search).split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const folded = (keywords ?? []).map(foldText)
  return words.every((word) => folded.some((keyword) => keyword.includes(word)))
    ? 1
    : 0
}

/**
 * Command palette that jumps to any page from `app-surfaces`, opened from
 * the navbar triggers or with ⌘K / Ctrl+K. Owns the shortcut listener so the
 * navbar mounts exactly one per page, and records every listed page the user
 * lands on so an empty query suggests the recent ones first. Once the user
 * types, it also lists playbooks, jobs, scripts and inventory groups, loaded
 * from their list queries while the dialog is open.
 */
export function SurfaceSearchDialog({
  open,
  onOpenChange,
  currentPath,
  userId,
}: SurfaceSearchDialogProps) {
  const { t } = useTranslation("nav")
  const groups = useMemo(
    (): SurfaceSearchResultGroup[] =>
      getSearchableSurfaces().map((group) => {
        const heading = t(group.headingKey)
        return {
          heading,
          items: group.items.map((item) => ({
            href: item.href,
            label: t(item.labelKey),
            description: t(item.descriptionKey),
            icon: item.icon,
            section: heading,
            trail: item.trailKeys.map((key) => t(key)),
          })),
        }
      }),
    [t]
  )
  const itemsByHref = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.items.map((item) => [item.href, item] as const)
        )
      ),
    [groups]
  )
  const recordGroups = useSurfaceSearchRecords({ enabled: open })
  // Records take part so `/jobs/<id>` marks that job, not a page.
  const currentHref = getCurrentSearchHref(
    currentPath,
    [...groups, ...recordGroups].flatMap((group) =>
      group.items.map((item) => item.href)
    )
  )
  const [search, setSearch] = useState("")
  const [recentHrefs, setRecentHrefs] = useState(() =>
    readRecentSurfaces(userId)
  )

  // Only exact visits count: `/jobs/42` is not a visit to a page.
  useEffect(() => {
    if (!itemsByHref.has(currentPath)) return
    setRecentHrefs(recordRecentSurface(userId, currentPath))
  }, [currentPath, itemsByHref, userId])

  // Hrefs no longer registered (removed route) are skipped.
  const recentItems = recentHrefs
    .filter((href) => href !== currentHref)
    .flatMap((href) => itemsByHref.get(href) ?? [])
  const hasQuery = search.trim() !== ""
  const showRecent = !hasQuery && recentItems.length > 0

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      event.preventDefault()
      handleOpenChange(!open)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  })

  function handleOpenChange(next: boolean) {
    if (!next) setSearch("")
    onOpenChange(next)
  }

  function handleSelect(value: string) {
    const href = value.startsWith(RECENT_PREFIX)
      ? value.slice(RECENT_PREFIX.length)
      : value
    // Close first so the dialog's portal is gone before the View Transition
    // swaps the page.
    handleOpenChange(false)
    if (href !== currentHref) navigate(href)
  }

  function renderItem(item: SurfaceSearchResult, value: string) {
    const current = item.href === currentHref
    return (
      <CommandItem
        key={value}
        value={value}
        keywords={[item.label, item.description, item.section, ...item.trail]}
        onSelect={handleSelect}
        className="gap-2.5"
      >
        <item.icon aria-hidden className="text-primary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={textVariants({
              role: "compact",
              className: "font-medium leading-tight",
            })}
          >
            <SurfaceSearchLabel label={item.label} trail={item.trail} />
          </span>
          <span
            className={textVariants({
              role: "compact",
              tone: "muted",
              className: "line-clamp-2 leading-snug",
            })}
          >
            {item.description}
          </span>
        </span>
        {current ? (
          <>
            <StatusDot tone="primary" className="shrink-0" />
            <span className="sr-only">{t("search.current_page")}</span>
          </>
        ) : null}
      </CommandItem>
    )
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("search.title")}
      description={t("search.description")}
      filter={matchSurface}
    >
      <CommandInput
        placeholder={t("search.placeholder")}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{t("search.empty")}</CommandEmpty>
        {showRecent ? (
          <CommandGroup heading={t("search.groups.recent")}>
            {recentItems.map((item) =>
              renderItem(item, `${RECENT_PREFIX}${item.href}`)
            )}
          </CommandGroup>
        ) : null}
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => renderItem(item, item.href))}
          </CommandGroup>
        ))}
        {hasQuery
          ? recordGroups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.items.map((item) => renderItem(item, item.href))}
              </CommandGroup>
            ))
          : null}
      </CommandList>
    </CommandDialog>
  )
}
