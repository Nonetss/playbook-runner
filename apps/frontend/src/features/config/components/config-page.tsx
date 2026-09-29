import { getIcon } from "@/lib/icon-registry"

const ExternalLink = getIcon("actions", "external")
const KeyRound = getIcon("resources", "apiKey")
const Plus = getIcon("actions", "add")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ApiKeyCreatedDialog } from "@/features/config/components/api-key-created-dialog"
import { ApiKeyFormModal } from "@/features/config/components/api-key-form-modal"
import {
  apiKeyDefinition,
  apiKeyLabel,
} from "@/features/config/definitions/api-key.definition"
import {
  useApiKeyDelete,
  useApiKeysList,
} from "@/features/config/hooks/use-api-keys"
import type { ApiKeyListItem } from "@/features/config/types"
import { useConfirm } from "@/hooks/use-confirm"

function ApiDocsNote() {
  const { t } = useTranslation("config")
  const host =
    typeof window !== "undefined" ? window.location.host : "localhost:4321"

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3">
      <Text as="p" variant="meta" tone="muted">
        {t("api_keys.docs_prefix")}{" "}
        <a
          href="/scalar"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-foreground underline decoration-primary underline-offset-4"
        >
          {`${host}/scalar`}
        </a>{" "}
        {t("api_keys.docs_suffix")}
      </Text>
      <a
        href="/scalar"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("api_keys.docs_open_aria")}
        className="-m-2 shrink-0 p-2 text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-m-3 pointer-coarse:p-3"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  )
}

function ConfigPageInner() {
  const { t, i18n } = useTranslation("config")
  const { t: tCommon } = useTranslation("common")
  const query = useApiKeysList()
  const deleteApiKey = useApiKeyDelete()
  const confirm = useConfirm()

  const [createOpen, setCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  async function handleDelete(apiKey: ApiKeyListItem) {
    const confirmed = await confirm({
      title: t("api_keys.delete.confirm_title", {
        label: apiKeyLabel(apiKey, t),
      }),
      description: t("api_keys.delete.confirm_description"),
      confirmLabel: t("api_keys.delete.confirm_label"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deleteApiKey.mutate({ id: apiKey.id })
  }

  const createButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t("page.create")}
    </Button>
  )

  return (
    <>
      <ResourceOverview
        surface="config"
        heroMeta={
          <HeroCount
            segments={[
              {
                count: query.data?.length ?? 0,
                label: tCommon("labels.total"),
              },
            ]}
          />
        }
        heroAction={createButton}
        heroChildren={<ApiDocsNote />}
        query={query}
        isEmpty={(apiKeys) => apiKeys.length === 0}
        empty={{
          icon: <KeyRound />,
          title: t("api_keys.empty.title"),
          description: t("api_keys.empty.description"),
          action: createButton,
        }}
      >
        {(apiKeys) => (
          <EntityCardGrid
            items={apiKeys}
            definition={apiKeyDefinition}
            context={{
              t,
              tCommon,
              language: i18n.language,
              deletingId: deleteApiKey.isPending
                ? (deleteApiKey.variables?.id ?? null)
                : null,
              onDelete: handleDelete,
            }}
          />
        )}
      </ResourceOverview>

      <ApiKeyFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(fullKey) => setCreatedKey(fullKey)}
      />

      <ApiKeyCreatedDialog
        open={createdKey !== null}
        onOpenChange={(open) => {
          if (!open) setCreatedKey(null)
        }}
        fullKey={createdKey}
      />
    </>
  )
}

export function ConfigPage() {
  return (
    <AppProviders>
      <ConfigPageInner />
    </AppProviders>
  )
}
