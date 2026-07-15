import { KeyRound, MoreHorizontal, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ApiKeyListItem } from "@/components/features/config/types"
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
    <Card className="h-full min-w-0 gap-4 overflow-hidden py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{label}</CardTitle>
              <CardDescription className="truncate font-mono text-xs">
                {identifier}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  t("api_keys.card.menu_aria", { defaultValue: "" }) ||
                  `${t("api_keys.actions_aria")} ${label}`
                }
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(apiKey.id)}
              >
                <Trash2 className="size-4" />
                {tCommon("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-3 overflow-hidden px-4">
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
      </CardContent>
    </Card>
  )
}
