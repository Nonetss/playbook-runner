import { getIcon } from "@/lib/icon-registry"

const ArrowLeft = getIcon("navigation", "back")
const BookText = getIcon("resources", "book")
const FolderPlus = getIcon("resources", "folderAdd")
const Search = getIcon("views", "search")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MovePlaybookDialog } from "@/features/playbooks/components/move-playbook-dialog"
import { PlaybookFolderFormModal } from "@/features/playbooks/components/playbook-folder-form-modal"
import { PlaybookList } from "@/features/playbooks/components/playbook-list"
import {
  usePlaybookFolderDelete,
  usePlaybookFoldersList,
} from "@/features/playbooks/hooks/usePlaybookFolders"
import {
  usePlaybookDelete,
  usePlaybookMove,
  usePlaybooksList,
} from "@/features/playbooks/hooks/usePlaybooks"
import type { Playbook, PlaybookFolder } from "@/features/playbooks/types"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

type ResourceFilter = "all" | "folders" | "playbooks"

function PlaybooksPageInner() {
  const { t, i18n } = useTranslation("playbooks")
  const { t: tCommon } = useTranslation("common")
  const cardLocale = i18n.language?.startsWith("en") ? "en-US" : "es-ES"
  const {
    data: playbooks = [],
    isPending,
    isError,
    refetch,
  } = usePlaybooksList()
  const {
    data: folders = [],
    isPending: areFoldersPending,
    isError: areFoldersError,
    refetch: refetchFolders,
  } = usePlaybookFoldersList()
  const deletePlaybook = usePlaybookDelete()
  const movePlaybook = usePlaybookMove()
  const deleteFolder = usePlaybookFolderDelete()
  const confirm = useConfirm()
  const [folderFormOpen, setFolderFormOpen] = React.useState(false)
  const [editingFolder, setEditingFolder] =
    React.useState<PlaybookFolder | null>(null)
  const [movingPlaybook, setMovingPlaybook] = React.useState<Playbook | null>(
    null
  )
  const [search, setSearch] = React.useState("")
  const [resourceFilter, setResourceFilter] =
    React.useState<ResourceFilter>("all")

  const folderId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("folder")
  const activeFolder = folders.find((folder) => folder.id === folderId) ?? null
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleFolders = React.useMemo(() => {
    if (folderId || resourceFilter === "playbooks") return []
    if (!normalizedSearch) return folders
    return folders.filter((folder) =>
      `${folder.name} ${folder.description ?? ""}`
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    )
  }, [folderId, folders, normalizedSearch, resourceFilter])
  const visiblePlaybooks = React.useMemo(() => {
    if (resourceFilter === "folders") return []
    return playbooks.filter((playbook) => {
      const isGlobalRootSearch = !folderId && normalizedSearch.length > 0
      if (!isGlobalRootSearch && playbook.folderId !== folderId) return false
      if (!normalizedSearch) return true
      return `${playbook.name} ${playbook.description ?? ""} ${playbook.content}`
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    })
  }, [folderId, normalizedSearch, playbooks, resourceFilter])

  function openFolderCreate() {
    setEditingFolder(null)
    setFolderFormOpen(true)
  }

  function openFolderEdit(folder: PlaybookFolder) {
    setEditingFolder(folder)
    setFolderFormOpen(true)
  }

  async function handleDelete(id: string) {
    const playbook = playbooks.find((item) => item.id === id)
    const label = playbook?.name ?? tCommon("labels.this_playbook")
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: t("card.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deletePlaybook.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("delete.error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleFolderDelete(folder: PlaybookFolder) {
    const confirmed = await confirm({
      title: t("folder.delete_title", { name: folder.name }),
      description: t("folder.delete_description"),
      confirmLabel: t("folder.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deleteFolder.mutateAsync({ id: folder.id })
    } catch {
      // The shared mutation hook displays the localized error toast.
    }
  }

  async function handleDropPlaybook(
    folder: PlaybookFolder,
    playbookId: string
  ) {
    const playbook = playbooks.find((item) => item.id === playbookId)
    if (!playbook || playbook.folderId === folder.id) return

    try {
      await movePlaybook.mutateAsync({
        id: playbook.id,
        folderId: folder.id,
      })
    } catch {
      // The shared mutation hook displays the localized error toast.
    }
  }

  const pageTitle = folderId
    ? (activeFolder?.name ?? t("folder.not_found"))
    : t("page.title")
  const pageDescription = folderId
    ? (activeFolder?.description ?? t("folder.subtitle"))
    : t("page.subtitle")
  const createHref = activeFolder
    ? `/playbooks/new?folder=${encodeURIComponent(activeFolder.id)}`
    : "/playbooks/new"
  const listItems = [...visibleFolders, ...visiblePlaybooks]
  const hasActiveFilters = search.trim().length > 0 || resourceFilter !== "all"

  return (
    <ResourcePage
      title={pageTitle}
      description={pageDescription}
      createLabel={t("page.create")}
      createHref={createHref}
    >
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div className="flex items-center gap-2">
            {folderId ? (
              <Button asChild variant="outline" size="sm">
                <a href="/playbooks">
                  <ArrowLeft className="size-4" />
                  {t("folder.back_to_root")}
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={openFolderCreate}>
                <FolderPlus className="size-4" />
                {t("folder.create")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
            <div className="flex w-full md:w-auto items-center gap-2">
              <Search className="text-muted-foreground size-4 shrink-0" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("filters.search_placeholder")}
                aria-label={t("filters.search_label")}
              />
            </div>

            <Select
              value={resourceFilter}
              onValueChange={(value) =>
                setResourceFilter(value as ResourceFilter)
              }
            >
              <SelectTrigger
                className="w-full md:w-40"
                aria-label={t("filters.type_label")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  {!folderId ? (
                    <SelectItem value="folders">
                      {t("filters.folders")}
                    </SelectItem>
                  ) : null}
                  <SelectItem value="playbooks">
                    {t("filters.playbooks")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {search && (
          <p className="text-muted-foreground text-xs">
            {folderId
              ? t("filters.searching_in_folder")
              : t("filters.searching_all")}
          </p>
        )}
      </div>

      {!folderId && folders.length > 0 && playbooks.length > 0 ? (
        <p className="text-muted-foreground mb-4 text-xs">
          {t("folder.drag_hint")}
        </p>
      ) : null}

      <ResourceListState
        isPending={isPending || areFoldersPending}
        isError={isError || areFoldersError}
        onRetry={() => {
          refetch()
          refetchFolders()
        }}
        items={listItems}
        empty={{
          title: hasActiveFilters
            ? t("filters.no_results")
            : folderId
              ? t("folder.empty_title")
              : t("empty.title"),
          description: hasActiveFilters
            ? t("filters.no_results_description")
            : folderId
              ? t("folder.empty_description")
              : t("empty.description"),
          ctaLabel: t("page.create"),
          ctaHref: createHref,
          icon: <BookText className="size-5" />,
        }}
      >
        {() => (
          <PlaybookList
            playbooks={visiblePlaybooks}
            folders={visibleFolders}
            allFolders={folders}
            allPlaybooks={playbooks}
            onEditFolder={openFolderEdit}
            onDeleteFolder={handleFolderDelete}
            onDropPlaybook={handleDropPlaybook}
            onDelete={handleDelete}
            onMove={setMovingPlaybook}
            locale={cardLocale}
            deletingFolderId={
              deleteFolder.isPending
                ? (deleteFolder.variables?.id ?? null)
                : null
            }
            deletingId={
              deletePlaybook.isPending
                ? (deletePlaybook.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>

      <PlaybookFolderFormModal
        open={folderFormOpen}
        onOpenChange={setFolderFormOpen}
        folder={editingFolder}
      />
      <MovePlaybookDialog
        open={!!movingPlaybook}
        onOpenChange={(open) => {
          if (!open) setMovingPlaybook(null)
        }}
        playbook={movingPlaybook}
        folders={folders}
      />
    </ResourcePage>
  )
}

export function PlaybooksPage() {
  return (
    <AppProviders>
      <PlaybooksPageInner />
    </AppProviders>
  )
}
