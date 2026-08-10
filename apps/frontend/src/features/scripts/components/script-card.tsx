import { getIcon } from "@/lib/icon-registry"

const FileCode2 = getIcon("resources", "fileCode")
const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { Script } from "@/features/scripts/types"

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
    <ResourceCard
      icon={<FileCode2 className="size-4" />}
      title={script.name}
      description={script.description}
      contentClassName="flex flex-1 flex-col gap-3"
      actions={
        <RowActionsMenu
          label={t("card.actions_aria", { name: script.name })}
          disabled={isDeleting}
        >
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
        </RowActionsMenu>
      }
    >
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
    </ResourceCard>
  )
}
