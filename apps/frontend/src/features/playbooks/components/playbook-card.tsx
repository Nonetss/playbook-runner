import { getIcon } from "@/lib/icon-registry"

const BookText = getIcon("resources", "book")
const Folder = getIcon("resources", "folder")
const FolderInput = getIcon("resources", "folderInput")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Playbook } from "@/features/playbooks/types"
import { navigate } from "@/lib/navigate"
import { cn } from "@/lib/utils"

type PlaybookCardProps = {
  playbook: Playbook
  folderName?: string
  onDelete: (id: string) => void
  onMove: (playbook: Playbook) => void
  isDeleting?: boolean
  locale?: string
}

export function PlaybookCard({
  playbook,
  folderName,
  onDelete,
  onMove,
  isDeleting = false,
  locale = "es-ES",
}: PlaybookCardProps) {
  const { t } = useTranslation("playbooks")
  const updatedAt = playbook.updatedAt
    ? new Date(playbook.updatedAt).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null
  const editHref = `/playbooks/${playbook.id}/edit`

  function isInteractiveTarget(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest(
      '[data-slot="card-action"], a, button'
    )
  }

  function openEdit() {
    if (isDeleting) return
    navigate(editHref)
  }

  return (
    <ResourceCard
      role="link"
      tabIndex={isDeleting ? undefined : 0}
      aria-label={`${t("card.edit")} ${playbook.name}`}
      icon={<BookText className="size-4" />}
      title={playbook.name}
      description={playbook.description}
      descriptionClassName="line-clamp-2 wrap-break-word"
      contentClassName="flex flex-1 flex-col gap-3"
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) return
        openEdit()
      }}
      onKeyDown={(event) => {
        if (isDeleting) return
        if (event.key !== "Enter" && event.key !== " ") return
        if (isInteractiveTarget(event.target)) return
        event.preventDefault()
        openEdit()
      }}
      actions={
        <RowActionsMenu
          label={t("card.actions_aria", { name: playbook.name })}
          disabled={isDeleting}
        >
          <DropdownMenuItem asChild>
            <a href={`/playbooks/${playbook.id}/run`}>
              <Play className="size-4" />
              {t("card.run")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={editHref}>
              <Pencil className="size-4" />
              {t("card.edit")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMove(playbook)}>
            <FolderInput className="size-4" />
            {t("card.move")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(playbook.id)}
          >
            <Trash2 className="size-4" />
            {t("card.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      }
      className={cn("h-full gap-4 py-4", !isDeleting && "cursor-pointer")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {t("card.yaml")}
        </Badge>
        {folderName ? (
          <Badge variant="outline" className="max-w-full text-xs">
            <Folder className="size-3" />
            <span className="truncate">
              {t("card.in_folder", { name: folderName })}
            </span>
          </Badge>
        ) : null}
        {updatedAt && (
          <span className="text-muted-foreground text-xs">
            {t("card.updated_on", { date: updatedAt })}
          </span>
        )}
      </div>

      <pre className="text-muted-foreground max-h-[4.5rem] overflow-hidden rounded-md border border-border/40 bg-muted/20 px-2.5 py-2 font-mono text-xs leading-relaxed wrap-break-word whitespace-pre-wrap">
        {playbook.content}
      </pre>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-auto w-full"
        disabled={isDeleting}
      >
        <a href={`/playbooks/${playbook.id}/run`}>
          <Play className="size-4" />
          {t("card.run")}
        </a>
      </Button>
    </ResourceCard>
  )
}
