import { Check, ChevronDown, Folder, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { usePlaybookFoldersList } from "@/components/features/playbooks/hooks/usePlaybookFolders"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { navigate } from "@/lib/navigate"
import { cn } from "@/lib/utils"

type PlaybookSwitcherProps = {
  currentId: string
  disabled?: boolean
}

export function PlaybookSwitcher({
  currentId,
  disabled = false,
}: PlaybookSwitcherProps) {
  const { t } = useTranslation("playbooks")
  const { data: playbooks = [] } = usePlaybooksList()
  const { data: folders = [] } = usePlaybookFoldersList()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders]
  )

  const sortedPlaybooks = useMemo(
    () =>
      [...playbooks].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [playbooks]
  )

  const searchQuery = search.trim().toLowerCase()

  const filteredPlaybooks = useMemo(() => {
    if (!searchQuery) return sortedPlaybooks
    return sortedPlaybooks.filter((playbook) => {
      const folderName = playbook.folderId
        ? folderById.get(playbook.folderId)
        : null
      return [playbook.name, playbook.description, folderName].some((field) =>
        field?.toLowerCase().includes(searchQuery)
      )
    })
  }, [folderById, searchQuery, sortedPlaybooks])

  const currentPlaybook = playbooks.find(
    (playbook) => playbook.id === currentId
  )

  function handleSelect(playbookId: string) {
    setOpen(false)
    setSearch("")
    if (playbookId !== currentId) {
      navigate(`/playbooks/${playbookId}/run`)
    }
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
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={t("run.switcher.label")}
          className={cn(
            "h-8 w-full max-w-sm justify-between gap-2 font-normal shadow-xs",
            open && "border-ring ring-[3px] ring-ring/50"
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">
              {currentPlaybook?.name ?? t("run.playbook_not_found")}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 opacity-60 transition-transform",
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
        <div className="bg-muted/40 border-b px-3 py-2">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase tracking-wide">
            {t("run.switcher.label")}
          </p>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
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
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              {t("run.switcher.no_results")}
            </p>
          ) : filteredPlaybooks.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">
              {t("run.switcher.no_match")}
            </p>
          ) : (
            filteredPlaybooks.map((playbook) => {
              const folderName = playbook.folderId
                ? folderById.get(playbook.folderId)
                : null
              const selected = playbook.id === currentId

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
                    {folderName ? (
                      <span className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-[11px]">
                        <Folder className="size-2.5 shrink-0" />
                        {folderName}
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
