import { FileCode, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Script } from "@/components/features/scripts/types"
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

type ScriptCardProps = {
  script: Script
  onDelete: (id: string) => void
  isDeleting?: boolean
  locale?: string
}

export function ScriptCard({
  script,
  onDelete,
  isDeleting = false,
  locale = "es-ES",
}: ScriptCardProps) {
  const { t } = useTranslation("scripts")
  const updatedAt = script.updatedAt
    ? new Date(script.updatedAt).toLocaleDateString(locale, {
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
              <FileCode className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {script.name}
              </CardTitle>
              {script.description && (
                <CardDescription className="truncate">
                  {script.description}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("card.actions_aria", { name: script.name })}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/scripts/${script.id}/run`}>
                  <Play className="size-4" />
                  {t("card.run")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/scripts/${script.id}/edit`}>
                  <Pencil className="size-4" />
                  {t("card.edit")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(script.id)}
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
            {script.language ?? t("card.default_language")}
          </Badge>
          {updatedAt && (
            <span className="text-muted-foreground text-xs">
              {t("card.updated_on", { date: updatedAt })}
            </span>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 font-mono text-xs whitespace-pre-wrap">
          {script.content}
        </p>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          disabled={isDeleting}
        >
          <a href={`/scripts/${script.id}/run`}>
            <Play className="size-4" />
            {t("card.run")}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
