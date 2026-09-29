import { getIcon } from "@/lib/icon-registry"

const Folder = getIcon("resources", "folder")
const FolderOpen = getIcon("resources", "folderOpen")
const Pencil = getIcon("actions", "edit")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Playbook, PlaybookFolder } from "@/features/playbooks/types"
import { cn } from "@/lib/utils"

type PlaybookFolderCardProps = {
  folder: PlaybookFolder
  playbooks: Playbook[]
  onEdit: (folder: PlaybookFolder) => void
  onDelete: (folder: PlaybookFolder) => void
  isDeleting?: boolean
}

export function PlaybookFolderCard({
  folder,
  playbooks,
  onEdit,
  onDelete,
  isDeleting = false,
}: PlaybookFolderCardProps) {
  const { t } = useTranslation("playbooks")
  const openHref = `/playbooks?folder=${encodeURIComponent(folder.id)}`

  // The title is a stretched link (its ::after covers the card), so the
  // whole card is clickable without nesting the action buttons inside a link.
  return (
    <Card
      className={cn(
        "relative h-full gap-4 py-4",
        !isDeleting && "hover:bg-accent/30 transition-colors"
      )}
    >
      <CardHeader className="px-4">
        <div className="flex min-w-0 items-start gap-3 overflow-hidden pr-2 text-left">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <Folder className="size-4" />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="truncate text-base">
              {isDeleting ? (
                folder.name
              ) : (
                <a
                  href={openHref}
                  aria-label={`${t("folder.open")} ${folder.name}`}
                  className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {folder.name}
                </a>
              )}
            </CardTitle>
            {folder.description ? (
              <CardDescription className="line-clamp-2 wrap-break-word">
                {folder.description}
              </CardDescription>
            ) : null}
          </span>
        </div>

        <CardAction className="relative z-10">
          <RowActionsMenu
            label={t("folder.actions_aria", { name: folder.name })}
            disabled={isDeleting}
          >
            <DropdownMenuItem asChild>
              <a href={openHref}>
                <FolderOpen className="size-4" />
                {t("folder.open")}
              </a>
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
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <p className="text-muted-foreground text-xs">
          {t("folder.playbook_count", { count: playbooks.length })}
        </p>
        {playbooks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {playbooks.slice(0, 4).map((playbook) => (
              <Badge
                key={playbook.id}
                variant="outline"
                className="max-w-full text-xs"
                title={playbook.name}
              >
                <span className="truncate">{playbook.name}</span>
              </Badge>
            ))}
            {playbooks.length > 4 ? (
              <span className="text-muted-foreground text-xs">
                +{playbooks.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="relative z-10 mt-auto w-full"
          disabled={isDeleting}
        >
          <a href={openHref}>
            <FolderOpen className="size-4" />
            {t("folder.open")}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
