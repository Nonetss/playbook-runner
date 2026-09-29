import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")
const Play = getIcon("actions", "play")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import type { Script } from "@/features/scripts/types"
import { formatDate } from "@/lib/format"
import { navigate } from "@/lib/navigate"

export interface ScriptRowContext {
  t: TFunction<"scripts">
  language: string
  deletingId: string | null
  onDelete: (script: Script) => void
}

export const scriptDefinition: EntityListDefinition<Script, ScriptRowContext> =
  {
    getKey: (script) => script.id,
    getPrimary: (script) => script.name,
    getSecondary: (script) => script.description,
    getOpenHref: (script) => `/scripts/${script.id}/edit`,
    isMuted: (script, { deletingId }) => deletingId === script.id,
    metadata: [
      {
        key: "language",
        label: ({ t }) => t("form.language_label"),
        value: (script, { t }) => (
          <Text variant="data">
            {script.language ?? t("card.default_language")}
          </Text>
        ),
      },
      {
        key: "updated",
        label: ({ t }) => t("card.updated_label"),
        value: (script, { language }) => (
          <Text variant="data" tone="muted">
            {formatDate(script.updatedAt, language)}
          </Text>
        ),
      },
    ],
    renderTrailing: (script, { t }) => (
      <Button asChild variant="outline" size="sm">
        <AppLink href={`/scripts/${script.id}/run`}>
          <Play className="size-3.5" />
          {t("card.run")}
        </AppLink>
      </Button>
    ),
    actions: [
      {
        key: "edit",
        label: (_, { t }) => t("card.edit"),
        icon: Pencil,
        onSelect: (script) => navigate(`/scripts/${script.id}/edit`),
      },
      {
        key: "delete",
        label: (_, { t }) => t("card.delete"),
        icon: Trash2,
        destructive: true,
        disabled: (script, { deletingId }) => deletingId === script.id,
        onSelect: (script, { onDelete }) => onDelete(script),
      },
    ],
  }
