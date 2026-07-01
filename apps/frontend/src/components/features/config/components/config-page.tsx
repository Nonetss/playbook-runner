import { ExternalLink, KeyRound } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ApiKeyCreatedDialog } from "@/components/features/config/components/api-key-created-dialog"
import { ApiKeyFormModal } from "@/components/features/config/components/api-key-form-modal"
import { ApiKeyList } from "@/components/features/config/components/api-key-list"
import {
  useApiKeyDelete,
  useApiKeysList,
} from "@/components/features/config/hooks/useApiKeys"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"

function ConfigPageInner() {
  const { t, i18n } = useTranslation("config")
  const { t: tCommon } = useTranslation("common")
  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-ES"
  const { data: apiKeys = [], isPending, isError, refetch } = useApiKeysList()
  const deleteApiKey = useApiKeyDelete()
  const confirm = useConfirm()

  const [createOpen, setCreateOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  function openCreateModal() {
    setCreateOpen(true)
  }

  async function handleDelete(id: string) {
    const target = apiKeys.find((item) => item.id === id)
    const label = target?.name?.trim() || t("api_keys.unnamed")
    const confirmed = await confirm({
      title: t("api_keys.delete.confirm_title", { label }),
      description: t("api_keys.delete.confirm_description"),
      confirmLabel: t("api_keys.delete.confirm_label"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    await deleteApiKey.mutateAsync({ id })
  }

  return (
    <ResourcePage
      title={t("page.title")}
      description={t("page.subtitle")}
      createLabel={t("page.create")}
      onCreate={openCreateModal}
    >
      <div className="border-border bg-muted/40 -mt-2 mb-6 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {t("api_keys.docs_prefix")}{" "}
          <a
            href="/scalar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-mono text-center whitespace-nowrap px-1 text-xs font-medium underline underline-offset-4 hover:text-primary"
          >
            {`${typeof window !== "undefined" ? window.location.host : "localhost:4321"}/scalar`}
          </a>{" "}
          {t("api_keys.docs_suffix")}
        </p>
        <a
          href="/scalar"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("api_keys.docs_open_aria")}
          className="text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </div>

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

      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={apiKeys}
        empty={{
          title: t("api_keys.empty.title"),
          description: t("api_keys.empty.description"),
          ctaLabel: t("page.create"),
          onCta: openCreateModal,
          icon: <KeyRound className="size-5" />,
        }}
      >
        {(items) => (
          <ApiKeyList
            apiKeys={items}
            onDelete={handleDelete}
            locale={locale}
            deletingId={
              deleteApiKey.isPending
                ? (deleteApiKey.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function ConfigPage() {
  return (
    <AppProviders>
      <ConfigPageInner />
    </AppProviders>
  )
}
