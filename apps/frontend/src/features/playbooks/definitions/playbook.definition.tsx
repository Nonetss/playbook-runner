import { getIcon } from "@/lib/icon-registry"

const FolderInput = getIcon("resources", "folderInput")
const Pencil = getIcon("actions", "edit")
const Role = getIcon("resources", "role")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { Hint } from "@/components/shared/feedback/hint"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import type {
  Playbook,
  PlaybookRepositoryRoles,
} from "@/features/playbooks/types"
import { formatDate } from "@/lib/format"
import { navigate } from "@/lib/navigate"

export interface PlaybookRowContext {
  t: TFunction<"playbooks">
  language: string
  deletingId: string | null
  /** Folder name per id; shown only when rows from several folders mix. */
  folderNames?: Map<string, string>
  /** Roles declared by each Git playbook, by path; once its repository is open. */
  rolesByPath?: Map<string, PlaybookRepositoryRoles["playbookRoles"][number]>
  onDelete: (playbook: Playbook) => void
  onMove: (playbook: Playbook) => void
}

export const playbookDefinition: EntityListDefinition<
  Playbook,
  PlaybookRowContext
> = {
  getKey: (playbook) => playbook.id,
  getPrimary: (playbook) => playbook.name,
  getSecondary: (playbook, { t, rolesByPath }) => {
    const usage = playbook.path ? rolesByPath?.get(playbook.path) : undefined
    if (!usage) return playbook.description
    const names = [
      ...usage.roles,
      ...(usage.dynamic ? [t("repository.roles_dynamic")] : []),
    ].join(", ")
    return (
      <>
        {playbook.description}
        <span className="mt-1 flex items-start gap-1.5 text-foreground">
          <Role className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">{t("repository.roles_heading")}: </span>
          <Text variant="data">{names}</Text>
        </span>
      </>
    )
  },
  // A card runs the playbook; the pencil is the way to its editor. A file that
  // vanished from its repository cannot run, so its card opens the editor.
  getOpenHref: (playbook) =>
    `/playbooks/${playbook.id}/${playbook.missing ? "edit" : "run"}`,
  isMuted: (playbook, { deletingId }) => deletingId === playbook.id,
  metadata: [
    {
      key: "source",
      label: ({ t }) => t("repository.source_label"),
      hidden: (playbook) => playbook.source !== "git",
      // A repository says once that its playbooks are read-only Git files;
      // a compact card only repeats it when the file went missing.
      compactHidden: (playbook) => !playbook.missing,
      value: (playbook, { t }) =>
        playbook.missing ? (
          <StatusTag dotTone="destructive">{t("repository.missing")}</StatusTag>
        ) : (
          <StatusTag dotTone="muted">{t("repository.read_only")}</StatusTag>
        ),
    },
    {
      key: "folder",
      label: ({ t }) => t("form.folder_label"),
      hidden: (playbook, { folderNames }) =>
        !folderNames || playbook.source === "git",
      value: (playbook, { t, folderNames }) => (
        <Text variant="meta" tone="muted" className="truncate">
          {(playbook.folderId && folderNames?.get(playbook.folderId)) ??
            t("folder.root")}
        </Text>
      ),
    },
    {
      key: "updated",
      label: ({ t }) => t("card.updated_label"),
      value: (playbook, { language }) => (
        <Text variant="data" tone="muted">
          {formatDate(playbook.updatedAt, language)}
        </Text>
      ),
    },
  ],
  renderTrailing: (playbook, { t }, density) => {
    if (playbook.missing) return null
    const href = `/playbooks/${playbook.id}/edit`
    if (density === "compact") {
      return (
        <Hint label={t("card.edit")}>
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          >
            <AppLink href={href} aria-label={t("card.edit")}>
              <Pencil className="size-3.5" />
            </AppLink>
          </Button>
        </Hint>
      )
    }
    return (
      <Button asChild variant="outline" size="sm">
        <AppLink href={href}>
          <Pencil className="size-3.5" />
          {t("card.edit")}
        </AppLink>
      </Button>
    )
  },
  // Git-sourced playbooks belong to their repository sync: read-only.
  actions: [
    {
      key: "edit",
      hidden: (playbook) => playbook.source === "git",
      label: (_, { t }) => t("card.edit"),
      icon: Pencil,
      onSelect: (playbook) => navigate(`/playbooks/${playbook.id}/edit`),
    },
    {
      key: "move",
      hidden: (playbook) => playbook.source === "git",
      label: (_, { t }) => t("card.move"),
      icon: FolderInput,
      onSelect: (playbook, { onMove }) => onMove(playbook),
    },
    {
      key: "delete",
      hidden: (playbook) => playbook.source === "git",
      label: (_, { t }) => t("card.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (playbook, { deletingId }) => deletingId === playbook.id,
      onSelect: (playbook, { onDelete }) => onDelete(playbook),
    },
  ],
}
