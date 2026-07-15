import {
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"
import type {
  Playbook,
  PlaybookFolder,
} from "@/components/features/playbooks/types"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { navigate } from "@/lib/navigate"
import { cn } from "@/lib/utils"

const PLAYBOOK_DRAG_TYPE = "application/x-playbook-id"

type PlaybookFolderCardProps = {
  folder: PlaybookFolder
  playbooks: Playbook[]
  onEdit: (folder: PlaybookFolder) => void
  onDelete: (folder: PlaybookFolder) => void
  onDropPlaybook: (folder: PlaybookFolder, playbookId: string) => void
  isDeleting?: boolean
}

export function PlaybookFolderCard({
  folder,
  playbooks,
  onEdit,
  onDelete,
  onDropPlaybook,
  isDeleting = false,
}: PlaybookFolderCardProps) {
  const { t } = useTranslation("playbooks")
  const [isDragOver, setIsDragOver] = React.useState(false)
  const openHref = `/playbooks?folder=${encodeURIComponent(folder.id)}`

  function acceptsPlaybook(event: React.DragEvent) {
    return Array.from(event.dataTransfer.types).includes(PLAYBOOK_DRAG_TYPE)
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest(
      '[data-slot="card-action"], a, button'
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
        "relative h-full gap-4 py-4 transition-[box-shadow,background-color]",
        !isDeleting && "cursor-pointer",
        isDragOver && "bg-accent/50 ring-2 ring-primary"
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
      onDragEnter={(event) => {
        if (acceptsPlaybook(event)) setIsDragOver(true)
      }}
      onDragOver={(event) => {
        if (!acceptsPlaybook(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        if (!acceptsPlaybook(event)) return
        event.preventDefault()
        setIsDragOver(false)
        const playbookId = event.dataTransfer.getData(PLAYBOOK_DRAG_TYPE)
        if (playbookId) onDropPlaybook(folder, playbookId)
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("folder.actions_aria", { name: folder.name })}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        {isDragOver ? (
          <p className="text-primary text-xs font-medium">
            {t("folder.drop_here")}
          </p>
        ) : null}
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
