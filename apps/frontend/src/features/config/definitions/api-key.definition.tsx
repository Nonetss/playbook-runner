import { getIcon } from "@/lib/icon-registry"

const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type { ApiKeyListItem } from "@/features/config/types"
import { formatDate } from "@/lib/format"

export interface ApiKeyRowContext {
  t: TFunction<"config">
  tCommon: TFunction<"common">
  language: string
  deletingId: string | null
  onDelete: (apiKey: ApiKeyListItem) => void
}

export function apiKeyLabel(apiKey: ApiKeyListItem, t: TFunction<"config">) {
  return apiKey.name?.trim() || t("api_keys.unnamed")
}

export const apiKeyDefinition: EntityListDefinition<
  ApiKeyListItem,
  ApiKeyRowContext
> = {
  getKey: (apiKey) => apiKey.id,
  getAccessibleLabel: (apiKey, { t }) => apiKeyLabel(apiKey, t),
  getPrimary: (apiKey, { t }) => apiKeyLabel(apiKey, t),
  getSecondary: (apiKey) => (
    <Text variant="data" tone="muted">
      {apiKey.start ?? apiKey.prefix ?? `${apiKey.id.slice(0, 8)}…`}
    </Text>
  ),
  getStatus: (apiKey, { tCommon }) =>
    apiKey.enabled
      ? { tone: "foreground", label: tCommon("status.enabled") }
      : { tone: "border", label: tCommon("status.disabled") },
  isMuted: (apiKey, { deletingId }) =>
    !apiKey.enabled || deletingId === apiKey.id,
  metadata: [
    {
      key: "created",
      label: ({ t }) => t("api_keys.card.created_label"),
      value: (apiKey, { language }) => (
        <Text variant="data">{formatDate(apiKey.createdAt, language)}</Text>
      ),
    },
    {
      key: "expires",
      label: ({ t }) => t("api_keys.card.expires_label"),
      value: (apiKey, { t, language }) =>
        apiKey.expiresAt ? (
          <Text variant="data">{formatDate(apiKey.expiresAt, language)}</Text>
        ) : (
          <Text variant="meta" tone="muted">
            {t("api_keys.card.no_expiry")}
          </Text>
        ),
    },
  ],
  actions: [
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (apiKey, { deletingId }) => deletingId === apiKey.id,
      onSelect: (apiKey, { onDelete }) => onDelete(apiKey),
    },
  ],
}
