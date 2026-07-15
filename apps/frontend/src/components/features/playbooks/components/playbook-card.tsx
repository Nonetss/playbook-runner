import {
  BookText,
  Folder,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from "lucide-react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import type { Playbook } from "@/components/features/playbooks/types"
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
import { cn } from "@/lib/utils"

const PLAYBOOK_DRAG_TYPE = "application/x-playbook-id"

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

  return (
    <Card
      className={cn(
        "h-full gap-4 py-4",
        !isDeleting && "cursor-grab active:cursor-grabbing"
      )}
      draggable={!isDeleting}
      onDragStart={(event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData(PLAYBOOK_DRAG_TYPE, playbook.id)
        event.dataTransfer.setData("text/plain", playbook.id)
      }}
    >
      <CardHeader className="px-4">
        <div className="flex min-w-0 items-start gap-3 overflow-hidden pr-2">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <BookText className="size-4" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <CardTitle className="truncate text-base">
              {playbook.name}
            </CardTitle>
            {playbook.description && (
              <CardDescription className="line-clamp-2 wrap-break-word">
                {playbook.description}
              </CardDescription>
            )}
          </div>
        </div>

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("card.actions_aria", { name: playbook.name })}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/playbooks/${playbook.id}/run`}>
                  <Play className="size-4" />
                  {t("card.run")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/playbooks/${playbook.id}/edit`}>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
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

        <p className="text-muted-foreground line-clamp-3 overflow-hidden break-all font-mono text-xs">
          {playbook.content}
        </p>

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
      </CardContent>
    </Card>
  )
}
