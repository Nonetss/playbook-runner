import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")
const ChevronDown = getIcon("controls", "expand")
const Folder = getIcon("resources", "folder")
const GitBranch = getIcon("resources", "repository")
const Search = getIcon("views", "search")

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { usePlaybookFoldersList } from "@/features/playbooks/hooks/use-playbook-folders"
import { usePlaybooksList } from "@/features/playbooks/hooks/use-playbooks"
import { useRepositoriesList } from "@/features/playbooks/hooks/use-repositories"
import { cn } from "@/lib/utils"

export type PlaybookPickerProps = {
  /** Selected playbook id, or "" for none. */
  value: string
  onChange: (playbookId: string) => void
  disabled?: boolean
  /** Id of the trigger button, for an external `<label htmlFor>`. */
  id?: string
  /** Trigger text when nothing is selected (or the id is unknown). */
  placeholder?: string
  /** `sm` for toolbars (run page), `default` for form fields. */
  size?: "sm" | "default"
}

/**
 * Searchable playbook select: a dropdown with a search box over every
 * playbook, showing its folder or Git repository. Playbooks gone from their
 * repository are not offered (unless already selected).
 */
export function PlaybookPicker({
  value,
  onChange,
  disabled = false,
  id,
  placeholder,
  size = "default",
}: PlaybookPickerProps) {
  const { t } = useTranslation("playbooks")
  const { data: playbooks = [] } = usePlaybooksList()
  const { data: folders = [] } = usePlaybookFoldersList()
  const { data: repositories = [] } = useRepositoriesList()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders]
  )
  const repositoryById = useMemo(
    () =>
      new Map(
        repositories.map((repository) => [repository.id, repository.name])
      ),
    [repositories]
  )

  const sortedPlaybooks = useMemo(
    () =>
      playbooks
        .filter((playbook) => !playbook.missing || playbook.id === value)
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [playbooks, value]
  )

  /** Where a playbook lives: its Git repository or its folder. */
  function locationOf(playbook: (typeof playbooks)[number]) {
    if (playbook.repositoryId) {
      return {
        kind: "repository",
        name: repositoryById.get(playbook.repositoryId),
      }
    }
    if (playbook.folderId) {
      return { kind: "folder", name: folderById.get(playbook.folderId) }
    }
    return null
  }

  const searchQuery = search.trim().toLowerCase()

  const filteredPlaybooks = sortedPlaybooks.filter((playbook) => {
    if (!searchQuery) return true
    return [
      playbook.name,
      playbook.description,
      locationOf(playbook)?.name,
    ].some((field) => field?.toLowerCase().includes(searchQuery))
  })

  const current = playbooks.find((playbook) => playbook.id === value)

  function handleSelect(playbookId: string) {
    setOpen(false)
    setSearch("")
    if (playbookId !== value) onChange(playbookId)
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSearch("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          disabled={disabled}
          aria-label={id ? undefined : t("run.switcher.label")}
          className={cn(
            "w-full justify-between gap-2 font-normal shadow-xs",
            size === "sm" ? "h-8 max-w-sm" : "h-9 px-3",
            open && "border-ring ring-[3px] ring-ring/50"
          )}
        >
          <span className={cn("truncate", !current && "text-muted-foreground")}>
            {current?.name ?? placeholder ?? t("run.playbook_not_found")}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground opacity-60 transition-transform",
              open && "rotate-180"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-72 p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b bg-muted/40 px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder={t("run.switcher.search_placeholder")}
              aria-label={t("run.switcher.search_label")}
              className="h-8 border-0 bg-background pl-8 text-xs shadow-none focus-visible:ring-1"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {sortedPlaybooks.length === 0 ? (
            <p className="px-2 py-4 text-center text-muted-foreground text-xs">
              {t("run.switcher.no_results")}
            </p>
          ) : filteredPlaybooks.length === 0 ? (
            <p className="px-2 py-4 text-center text-muted-foreground text-xs">
              {t("run.switcher.no_match")}
            </p>
          ) : (
            filteredPlaybooks.map((playbook) => {
              const location = locationOf(playbook)
              const LocationIcon =
                location?.kind === "repository" ? GitBranch : Folder
              const selected = playbook.id === value

              return (
                <DropdownMenuItem
                  key={playbook.id}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-md px-2 py-2 last:mb-0",
                    selected && "bg-accent"
                  )}
                  onSelect={() => handleSelect(playbook.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-tight">
                      {playbook.name}
                    </span>
                    {location?.name ? (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-meta text-muted-foreground">
                        <LocationIcon className="size-2.5 shrink-0" />
                        {location.name}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      selected ? "text-primary opacity-100" : "opacity-0"
                    )}
                  />
                </DropdownMenuItem>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
