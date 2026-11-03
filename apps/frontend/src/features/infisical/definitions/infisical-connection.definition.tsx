import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type { InfisicalConnection } from "@/features/infisical/types"
import { formatDate } from "@/lib/format"

export interface InfisicalConnectionRowContext {
  t: TFunction<"infisical">
  tCommon: TFunction<"common">
  language: string
  deletingId: string | null
  onEdit: (connection: InfisicalConnection) => void
  onDelete: (connection: InfisicalConnection) => void
}

export const infisicalConnectionDefinition: EntityListDefinition<
  InfisicalConnection,
  InfisicalConnectionRowContext
> = {
  getKey: (connection) => connection.id,
  getPrimary: (connection) => connection.name,
  getSecondary: (connection) => (
    <span className="font-mono">{connection.url}</span>
  ),
  onOpen: (connection, { onEdit }) => onEdit(connection),
  isMuted: (connection, { deletingId }) => deletingId === connection.id,
  metadata: [
    {
      key: "project",
      label: ({ t }) => t("card.project_id"),
      value: (connection, { t }) => (
        <Text variant="data">
          {connection.projectId ?? t("card.project_missing")}
        </Text>
      ),
    },
    {
      key: "client",
      label: ({ t }) => t("card.client_id"),
      value: (connection) => <Text variant="data">{connection.clientId}</Text>,
    },
    {
      key: "created",
      label: ({ t }) => t("card.created_label"),
      value: (connection, { language }) => (
        <Text variant="data" tone="muted">
          {formatDate(connection.createdAt, language)}
        </Text>
      ),
    },
  ],
  actions: [
    {
      key: "edit",
      label: (_, { tCommon }) => tCommon("actions.edit"),
      icon: Pencil,
      onSelect: (connection, { onEdit }) => onEdit(connection),
    },
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (connection, { deletingId }) => deletingId === connection.id,
      onSelect: (connection, { onDelete }) => onDelete(connection),
    },
  ],
}
