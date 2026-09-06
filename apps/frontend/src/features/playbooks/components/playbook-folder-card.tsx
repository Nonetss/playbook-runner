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
import { navigate } from "@/lib/navigate"
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

  function isInteractiveTarget(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest(
      '[data-slot="card-action"], [data-slot="dropdown-menu-item"], [role="menuitem"], a, button'
    )
  }

  function openFolder() {
    if (isDeleting) return
    navigate(openHref)
  }

  return (
    <Card
      role="link"
      tabIndex={isDeleting ? undefined : 0}
      aria-label={`${t("folder.open")} ${folder.name}`}
      className={cn(
        "relative h-full gap-4 py-4",
        !isDeleting && "cursor-pointer"
      )}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) return
        openFolder()
      }}
      onKeyDown={(event) => {
        if (isDeleting) return
        if (event.key !== "Enter" && event.key !== " ") return
        if (isInteractiveTarget(event.target)) return
        event.preventDefault()
        openFolder()
      }}
    >
      <CardHeader className="px-4">
        <div className="flex min-w-0 items-start gap-3 overflow-hidden pr-2 text-left">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <Folder className="size-4" />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="truncate text-base">{folder.name}</CardTitle>
            {folder.description ? (
              <CardDescription className="line-clamp-2 wrap-break-word">
                {folder.description}
              </CardDescription>
            ) : null}
          </span>
        </div>

        <CardAction>
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
          className="mt-auto w-full"
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
