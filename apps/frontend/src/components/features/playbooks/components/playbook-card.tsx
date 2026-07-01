import { BookText, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Playbook } from "@/components/features/playbooks/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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

type PlaybookCardProps = {
  playbook: Playbook
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  onRun: (playbook: Playbook) => void
  isDeleting?: boolean
  locale?: string
}

export function PlaybookCard({
  playbook,
  onEdit,
  onDelete,
  onRun,
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
    <Card className="h-full gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <BookText className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {playbook.name}
              </CardTitle>
              {playbook.description && (
                <CardDescription className="truncate">
                  {playbook.description}
                </CardDescription>
              )}
            </div>
          </div>

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
              <DropdownMenuItem onClick={() => onRun(playbook)}>
                <Play className="size-4" />
                {t("card.run")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(playbook)}>
                <Pencil className="size-4" />
                {t("card.edit")}
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
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {t("card.yaml")}
          </Badge>
          {updatedAt && (
            <span className="text-muted-foreground text-xs">
              {t("card.updated_on", { date: updatedAt })}
            </span>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 font-mono text-xs whitespace-pre-wrap">
          {playbook.content}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={() => onRun(playbook)}
          disabled={isDeleting}
        >
          <Play className="size-4" />
          {t("card.run")}
        </Button>
      </CardContent>
    </Card>
  )
}
