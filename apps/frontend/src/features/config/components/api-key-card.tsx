import { getIcon } from "@/lib/icon-registry"

const KeyRound = getIcon("resources", "apiKey")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { ApiKeyListItem } from "@/features/config/types"

type ApiKeyCardProps = {
  apiKey: ApiKeyListItem
  onDelete: (id: string) => void
  isDeleting?: boolean
  locale?: string
}

export function ApiKeyCard({
  apiKey,
  onDelete,
  isDeleting = false,
  locale = "es-ES",
}: ApiKeyCardProps) {
  const { t } = useTranslation("config")
  const { t: tCommon } = useTranslation("common")
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const label = apiKey.name?.trim() || t("api_keys.unnamed")
  const createdAt = dateFormatter.format(new Date(apiKey.createdAt))
  const expiresAt = apiKey.expiresAt
    ? dateFormatter.format(new Date(apiKey.expiresAt))
    : null

  const identifier =
    apiKey.start ?? apiKey.prefix ?? `${apiKey.id.slice(0, 8)}…`

  return (
    <ResourceCard
      className="min-w-0 overflow-hidden"
      icon={<KeyRound className="size-4" />}
      title={label}
      description={identifier}
      descriptionClassName="font-mono text-xs"
      contentClassName="min-w-0 space-y-3 overflow-hidden"
      actions={
        <RowActionsMenu
          label={
            t("api_keys.card.menu_aria", { defaultValue: "" }) ||
            `${t("api_keys.actions_aria")} ${label}`
          }
          disabled={isDeleting}
        >
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(apiKey.id)}
          >
            <Trash2 className="size-4" />
            {tCommon("actions.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {t("api_keys.default_label")}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {apiKey.enabled
            ? tCommon("status.enabled")
            : tCommon("status.disabled")}
        </Badge>
      </div>

      <div className="text-muted-foreground space-y-0.5 text-xs">
        <p>{t("api_keys.created_at", { date: createdAt })}</p>
        {expiresAt ? (
          <p>{t("api_keys.card.expires_on", { date: expiresAt })}</p>
        ) : (
          <p>{t("api_keys.card.no_expiry")}</p>
        )}
      </div>
    </ResourceCard>
  )
}
