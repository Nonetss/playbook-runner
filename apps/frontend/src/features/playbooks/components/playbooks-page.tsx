import { getIcon } from "@/lib/icon-registry"

const ArrowLeft = getIcon("navigation", "back")
const BookText = getIcon("resources", "book")
const Folder = getIcon("resources", "folder")
const FolderOpen = getIcon("resources", "folderOpen")
const FolderPlus = getIcon("resources", "folderAdd")
const GitBranch = getIcon("resources", "repository")
const Pencil = getIcon("actions", "edit")
const Plus = getIcon("actions", "add")
const Search = getIcon("views", "search")
const Trash2 = getIcon("actions", "delete")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
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
import { RepositoryFormModal } from "@/features/playbooks/components/repository-form-modal"
import {
  type RepositoryGroup,
  RepositorySection,
} from "@/features/playbooks/components/repository-section"
import { SectionToggle } from "@/features/playbooks/components/section-toggle"
import {
  type PlaybookRowContext,
  playbookDefinition,
} from "@/features/playbooks/definitions/playbook.definition"
import { useCollapsedSections } from "@/features/playbooks/hooks/use-collapsed-sections"
import {
  usePlaybookFolderDelete,
  usePlaybookFoldersList,
} from "@/features/playbooks/hooks/use-playbook-folders"
import {
  usePlaybookDelete,
  usePlaybooksList,
} from "@/features/playbooks/hooks/use-playbooks"
import {
  useRepositoriesList,
  useRepositoryDelete,
  useRepositorySync,
} from "@/features/playbooks/hooks/use-repositories"
import type {
  Playbook,
  PlaybookFolder,
  PlaybookRepository,
} from "@/features/playbooks/types"
import { useConfirm } from "@/hooks/use-confirm"
import { cn } from "@/lib/utils"

type ResourceFilter = "all" | "folders" | "repositories" | "playbooks"

type FolderGroup = { folder: PlaybookFolder; playbooks: Playbook[] }

type PlaybooksView = {
  groups: FolderGroup[]
  repositories: RepositoryGroup[]
  loose: Playbook[]
}

function matches(text: string, search: string) {
  return text.toLocaleLowerCase().includes(search)
}

function playbookMatches(playbook: Playbook, search: string) {
  return (
    !search ||
    matches(
      `${playbook.name} ${playbook.description ?? ""} ${playbook.content}`,
      search
    )
  )
}

/** Folder heading (name, count, folder actions) over its playbook list. */
function FolderSection({
  group,
  rowContext,
  collapsed,
  onToggleCollapsed,
  isDeleting,
  onEdit,
  onDelete,
}: {
  group: FolderGroup
  rowContext: PlaybookRowContext
  collapsed: boolean
  onToggleCollapsed: () => void
  isDeleting: boolean
  onEdit: (folder: PlaybookFolder) => void
  onDelete: (folder: PlaybookFolder) => void
}) {
  const { t } = useTranslation("playbooks")
  const { folder, playbooks } = group
  const openHref = `/playbooks?folder=${encodeURIComponent(folder.id)}`

  return (
    <section
      aria-label={folder.name}
      className={cn(
        "dash-enter flex flex-col gap-3",
        isDeleting && "opacity-60"
      )}
    >
      <header className="flex items-center gap-3">
        <SectionToggle
          name={folder.name}
          collapsed={collapsed}
          controls={`section-${folder.id}`}
          onToggle={onToggleCollapsed}
        />
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <AppLink
              href={openHref}
              aria-label={`${t("folder.open")} ${folder.name}`}
              className="truncate rounded-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
            >
              <Text variant="headline">{folder.name}</Text>
            </AppLink>
            <Text variant="meta" tone="muted" className="shrink-0 tabular-nums">
              {t("folder.playbook_count", { count: playbooks.length })}
            </Text>
          </div>
          {folder.description ? (
            <Text as="p" variant="meta" tone="muted" className="truncate">
              {folder.description}
            </Text>
          ) : null}
        </div>
        <RowActionsMenu
          label={t("folder.actions_aria", { name: folder.name })}
          disabled={isDeleting}
        >
          <DropdownMenuItem asChild>
            <AppLink href={openHref}>
              <FolderOpen className="size-4" />
              {t("folder.open")}
            </AppLink>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(folder)}>
            <Pencil className="size-4" />
            {t("folder.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(folder)}
          >
            <Trash2 className="size-4" />
            {t("folder.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      </header>
      <div id={`section-${folder.id}`} hidden={collapsed}>
        {playbooks.length > 0 ? (
          <EntityCardGrid
            items={playbooks}
            definition={playbookDefinition}
            context={rowContext}
          />
        ) : (
          <Text
            as="p"
            variant="meta"
            tone="muted"
            className="rounded-xl border border-dashed bg-card/40 px-4 py-3"
          >
            {t("folder.empty_group")}
          </Text>
        )}
      </div>
    </section>
  )
}

function PlaybooksPageInner() {
  const { t, i18n } = useTranslation("playbooks")
  const { t: tCommon } = useTranslation("common")
  const playbooksQuery = usePlaybooksList()
  const foldersQuery = usePlaybookFoldersList()
  const repositoriesQuery = useRepositoriesList()
  const deletePlaybook = usePlaybookDelete()
  const deleteFolder = usePlaybookFolderDelete()
  const deleteRepository = useRepositoryDelete()
  const syncRepository = useRepositorySync()
  const { collapsed, toggle: toggleCollapsed } = useCollapsedSections()
  const confirm = useConfirm()
  const [folderFormOpen, setFolderFormOpen] = React.useState(false)
  const [editingFolder, setEditingFolder] =
    React.useState<PlaybookFolder | null>(null)
  const [repositoryFormOpen, setRepositoryFormOpen] = React.useState(false)
  const [editingRepository, setEditingRepository] =
    React.useState<PlaybookRepository | null>(null)
  const [movingPlaybook, setMovingPlaybook] = React.useState<Playbook | null>(
    null
  )
  const [search, setSearch] = React.useState("")
  const [resourceFilter, setResourceFilter] =
    React.useState<ResourceFilter>("all")

  const playbooks = playbooksQuery.data ?? []
  const folders = foldersQuery.data ?? []
  const repositories = repositoriesQuery.data ?? []
  const folderId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("folder")
  const activeFolder = folders.find((folder) => folder.id === folderId) ?? null
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const hasActiveFilters =
    normalizedSearch.length > 0 || resourceFilter !== "all"

  const view = React.useMemo<PlaybooksView>(() => {
    // Git-sourced playbooks are only browsed through their repository.
    const inline = playbooks.filter((playbook) => playbook.source === "inline")
    if (folderId) {
      return {
        groups: [],
        repositories: [],
        loose: inline.filter(
          (playbook) =>
            playbook.folderId === folderId &&
            playbookMatches(playbook, normalizedSearch)
        ),
      }
    }
    const groups =
      resourceFilter === "playbooks" || resourceFilter === "repositories"
        ? []
        : folders
            .map((folder) => ({
              folder,
              playbooks: inline.filter(
                (playbook) =>
                  playbook.folderId === folder.id &&
                  playbookMatches(playbook, normalizedSearch)
              ),
            }))
            .filter(
              ({ folder, playbooks: folderPlaybooks }) =>
                !normalizedSearch ||
                folderPlaybooks.length > 0 ||
                matches(
                  `${folder.name} ${folder.description ?? ""}`,
                  normalizedSearch
                )
            )
    const repositoryGroups =
      resourceFilter === "all" || resourceFilter === "repositories"
        ? repositories
            .map((repository) => ({
              repository,
              // By path; files gone upstream are not shown.
              playbooks: playbooks
                .filter(
                  (playbook) =>
                    playbook.repositoryId === repository.id &&
                    !playbook.missing &&
                    playbookMatches(playbook, normalizedSearch)
                )
                .sort((a, b) =>
                  (a.path ?? a.name).localeCompare(b.path ?? b.name)
                ),
            }))
            .filter(
              ({ repository, playbooks: repositoryPlaybooks }) =>
                !normalizedSearch ||
                repositoryPlaybooks.length > 0 ||
                matches(
                  `${repository.name} ${repository.url}`,
                  normalizedSearch
                )
            )
        : []
    const loose =
      resourceFilter === "folders" || resourceFilter === "repositories"
        ? []
        : inline.filter(
            (playbook) =>
              playbook.folderId === null &&
              playbookMatches(playbook, normalizedSearch)
          )
    return { groups, repositories: repositoryGroups, loose }
  }, [
    folderId,
    folders,
    normalizedSearch,
    playbooks,
    repositories,
    resourceFilter,
  ])

  function openFolderCreate() {
    setEditingFolder(null)
    setFolderFormOpen(true)
  }

  function openFolderEdit(folder: PlaybookFolder) {
    setEditingFolder(folder)
    setFolderFormOpen(true)
  }

  async function handleDelete(playbook: Playbook) {
    const confirmed = await confirm({
      title: t("delete.confirm_title", {
        label: playbook.name || tCommon("labels.this_playbook"),
      }),
      description: t("delete.confirm_description"),
      confirmLabel: t("card.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deletePlaybook.mutate({ id: playbook.id })
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

  function openRepositoryCreate() {
    setEditingRepository(null)
    setRepositoryFormOpen(true)
  }

  function openRepositoryEdit(repository: PlaybookRepository) {
    setEditingRepository(repository)
    setRepositoryFormOpen(true)
  }

  async function handleRepositoryDelete(repository: PlaybookRepository) {
    const confirmed = await confirm({
      title: t("repository.delete_title", { name: repository.name }),
      description: t("repository.delete_description"),
      confirmLabel: t("repository.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    try {
      await deleteRepository.mutateAsync({ id: repository.id })
    } catch {
      // The shared mutation hook displays the localized error toast.
    }
  }

  const rowContext: PlaybookRowContext = {
    t,
    language: i18n.language,
    deletingId: deletePlaybook.isPending
      ? (deletePlaybook.variables?.id ?? null)
      : null,
    onDelete: handleDelete,
    onMove: setMovingPlaybook,
  }
  const deletingFolderId = deleteFolder.isPending
    ? (deleteFolder.variables?.id ?? null)
    : null
  const deletingRepositoryId = deleteRepository.isPending
    ? (deleteRepository.variables?.id ?? null)
    : null
  const syncingRepositoryId = syncRepository.isPending
    ? (syncRepository.variables?.id ?? null)
    : null

  const createHref = activeFolder
    ? `/playbooks/new?folder=${encodeURIComponent(activeFolder.id)}`
    : "/playbooks/new"
  const createButton = (
    <Button asChild>
      <AppLink href={createHref}>
        <Plus className="size-4" />
        {t("page.create")}
      </AppLink>
    </Button>
  )
  const secondaryAction = folderId ? (
    <Button asChild variant="outline">
      <AppLink href="/playbooks">
        <ArrowLeft className="size-4" />
        {t("folder.back_to_root")}
      </AppLink>
    </Button>
  ) : (
    <>
      <Button variant="outline" onClick={openRepositoryCreate}>
        <GitBranch className="size-4" />
        {t("repository.create")}
      </Button>
      <Button variant="outline" onClick={openFolderCreate}>
        <FolderPlus className="size-4" />
        {t("folder.create")}
      </Button>
    </>
  )

  const filters = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("filters.search_placeholder")}
            aria-label={t("filters.search_label")}
            className="pl-8"
          />
        </div>
        {!folderId ? (
          <Select
            value={resourceFilter}
            onValueChange={(value) =>
              setResourceFilter(value as ResourceFilter)
            }
          >
            <SelectTrigger
              className="w-32 shrink-0 sm:w-40"
              aria-label={t("filters.type_label")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="folders">{t("filters.folders")}</SelectItem>
                <SelectItem value="repositories">
                  {t("filters.repositories")}
                </SelectItem>
                <SelectItem value="playbooks">
                  {t("filters.playbooks")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {search ? (
        <Text as="p" variant="meta" tone="muted">
          {folderId
            ? tCommon("filters.searching_in_folder")
            : tCommon("filters.searching_all")}
        </Text>
      ) : null}
    </div>
  )

  const allReady =
    playbooksQuery.data && foldersQuery.data && repositoriesQuery.data

  return (
    <>
      <ResourceOverview
        surface="playbooks"
        icon={folderId ? <FolderOpen /> : undefined}
        title={
          folderId ? (activeFolder?.name ?? t("folder.not_found")) : undefined
        }
        description={
          folderId
            ? (activeFolder?.description ?? t("folder.subtitle"))
            : undefined
        }
        heroMeta={
          <HeroCount
            segments={
              folderId
                ? [{ count: view.loose.length, label: tCommon("labels.total") }]
                : [
                    {
                      count: folders.length,
                      label: t("filters.folders").toLocaleLowerCase(),
                    },
                    {
                      count: repositories.length,
                      label: t("filters.repositories").toLocaleLowerCase(),
                    },
                    {
                      count: playbooks.filter((playbook) => !playbook.missing)
                        .length,
                      label: tCommon("labels.total"),
                    },
                  ]
            }
          />
        }
        heroAction={
          <div className="flex flex-wrap items-center gap-2">
            {secondaryAction}
            {createButton}
          </div>
        }
        filters={filters}
        query={{
          data: allReady ? view : undefined,
          isPending:
            playbooksQuery.isPending ||
            foldersQuery.isPending ||
            repositoriesQuery.isPending,
          isError:
            playbooksQuery.isError ||
            foldersQuery.isError ||
            repositoriesQuery.isError,
          refetch: () => {
            playbooksQuery.refetch()
            foldersQuery.refetch()
            repositoriesQuery.refetch()
          },
        }}
        isEmpty={(data) =>
          data.groups.length === 0 &&
          data.repositories.length === 0 &&
          data.loose.length === 0
        }
        hasActiveFilters={hasActiveFilters}
        filteredEmpty={{
          title: t("filters.no_results"),
          description: t("filters.no_results_description"),
          onClear: () => {
            setSearch("")
            setResourceFilter("all")
          },
        }}
        empty={{
          icon: <BookText />,
          title: folderId ? t("folder.empty_title") : t("empty.title"),
          description: folderId
            ? t("folder.empty_description")
            : t("empty.description"),
          action: createButton,
        }}
      >
        {(data) => (
          <div className="flex flex-col gap-8">
            {data.loose.length > 0 ? (
              <section className="flex flex-col gap-3">
                {data.groups.length + data.repositories.length > 0 ? (
                  <Text as="h2" variant="label" tone="muted">
                    {t("folder.root")}
                  </Text>
                ) : null}
                <EntityCardGrid
                  items={data.loose}
                  definition={playbookDefinition}
                  context={rowContext}
                />
              </section>
            ) : null}
            {data.groups.map((group) => (
              <FolderSection
                key={group.folder.id}
                group={group}
                rowContext={rowContext}
                isDeleting={deletingFolderId === group.folder.id}
                // A search shows its matches even inside collapsed sections.
                collapsed={!normalizedSearch && collapsed.has(group.folder.id)}
                onToggleCollapsed={() => toggleCollapsed(group.folder.id)}
                onEdit={openFolderEdit}
                onDelete={handleFolderDelete}
              />
            ))}
            {data.repositories.map((group) => (
              <RepositorySection
                key={group.repository.id}
                group={group}
                rowContext={rowContext}
                isDeleting={deletingRepositoryId === group.repository.id}
                collapsed={
                  !normalizedSearch && collapsed.has(group.repository.id)
                }
                onToggleCollapsed={() => toggleCollapsed(group.repository.id)}
                isSyncing={syncingRepositoryId === group.repository.id}
                onEdit={openRepositoryEdit}
                onDelete={handleRepositoryDelete}
                onSync={(repository) =>
                  syncRepository.mutate({ id: repository.id })
                }
              />
            ))}
          </div>
        )}
      </ResourceOverview>

      <PlaybookFolderFormModal
        open={folderFormOpen}
        onOpenChange={setFolderFormOpen}
        folder={editingFolder}
      />
      <RepositoryFormModal
        open={repositoryFormOpen}
        onOpenChange={setRepositoryFormOpen}
        repository={editingRepository}
        onCreated={(repository) => syncRepository.mutate({ id: repository.id })}
      />
      <MovePlaybookDialog
        open={!!movingPlaybook}
        onOpenChange={(open) => {
          if (!open) setMovingPlaybook(null)
        }}
        playbook={movingPlaybook}
        folders={folders}
      />
    </>
  )
}

export function PlaybooksPage() {
  return (
    <AppProviders>
      <PlaybooksPageInner />
    </AppProviders>
  )
}
