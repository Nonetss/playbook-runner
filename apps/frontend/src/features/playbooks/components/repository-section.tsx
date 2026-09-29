import { getIcon } from "@/lib/icon-registry"

const GitBranch = getIcon("resources", "repository")
const Pencil = getIcon("actions", "edit")
const RefreshCw = getIcon("actions", "sync")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { SectionToggle } from "@/features/playbooks/components/section-toggle"
import {
  type PlaybookRowContext,
  playbookDefinition,
} from "@/features/playbooks/definitions/playbook.definition"
import type {
  Playbook,
  PlaybookRepositoryList,
} from "@/features/playbooks/types"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export type RepositoryGroup = {
  repository: PlaybookRepositoryList[number]
  playbooks: Playbook[]
}

/**
 * A Git repository in the playbook browser: heading (name, remote, synced
 * commit, sync action) over its read-only playbooks.
 */
export function RepositorySection({
  group,
  rowContext,
  collapsed,
  onToggleCollapsed,
  isDeleting,
  isSyncing,
  onEdit,
  onDelete,
  onSync,
}: {
  group: RepositoryGroup
  rowContext: PlaybookRowContext
  collapsed: boolean
  onToggleCollapsed: () => void
  isDeleting: boolean
  isSyncing: boolean
  onEdit: (repository: RepositoryGroup["repository"]) => void
  onDelete: (repository: RepositoryGroup["repository"]) => void
  onSync: (repository: RepositoryGroup["repository"]) => void
}) {
  const { t, i18n } = useTranslation("playbooks")
  const { repository, playbooks } = group

  return (
    <section
      aria-label={repository.name}
      className={cn(
        "dash-enter flex flex-col gap-3",
        isDeleting && "opacity-60"
      )}
    >
      <header className="flex items-center gap-3">
        <SectionToggle
          name={repository.name}
          collapsed={collapsed}
          controls={`section-${repository.id}`}
          onToggle={onToggleCollapsed}
        />
        <GitBranch
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <Text variant="headline" className="truncate">
              {repository.name}
            </Text>
            <Text variant="meta" tone="muted" className="shrink-0 tabular-nums">
              {t("folder.playbook_count", { count: repository.playbookCount })}
            </Text>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <Text variant="data" tone="muted" className="truncate">
              {repository.url}@{repository.branch}
              {repository.subdir ? `:${repository.subdir}` : ""}
            </Text>
            <Text variant="meta" tone="muted" className="shrink-0">
              {repository.lastCommitSha && repository.lastSyncedAt
                ? t("repository.synced_at", {
                    commit: repository.lastCommitSha.slice(0, 7),
                    date: formatDateTime(
                      repository.lastSyncedAt,
                      i18n.language
                    ),
                  })
                : t("repository.never_synced")}
            </Text>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing || isDeleting}
          onClick={() => onSync(repository)}
        >
          <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
          {isSyncing ? t("repository.syncing") : t("repository.sync")}
        </Button>
        <RowActionsMenu
          label={t("repository.actions_aria", { name: repository.name })}
          disabled={isDeleting}
        >
          <DropdownMenuItem onClick={() => onEdit(repository)}>
            <Pencil className="size-4" />
            {t("repository.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(repository)}
          >
            <Trash2 className="size-4" />
            {t("repository.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      </header>
      {repository.lastSyncError ? (
        <InlineAlert title={t("repository.sync_failed")}>
          <span className="font-mono text-xs">{repository.lastSyncError}</span>
        </InlineAlert>
      ) : null}
      <div id={`section-${repository.id}`} hidden={collapsed}>
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
            {repository.lastCommitSha
              ? t("repository.empty_group")
              : t("repository.sync_hint")}
          </Text>
        )}
      </div>
    </section>
  )
}
