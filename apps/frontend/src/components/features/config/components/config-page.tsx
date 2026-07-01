import { ExternalLink, KeyRound } from "lucide-react"
import { useState } from "react"
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
    const label = target?.name?.trim() || "esta API key"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description:
        "Cualquier integración que esté usando esta clave dejará de funcionar.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })

    if (!confirmed) return

    await deleteApiKey.mutateAsync({ id })
  }

  return (
    <ResourcePage
      title="Configuración"
      description="Gestiona las API keys para autenticar integraciones externas."
      createLabel="Nueva API key"
      onCreate={openCreateModal}
    >
      <div className="border-border bg-muted/40 -mt-2 mb-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          En{"  "}
          <a
            href="/scalar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground font-mono text-center whitespace-nowrap px-1 text-xs font-medium underline underline-offset-4 hover:text-primary"
          >
            {`${window.location.host}/scalar`}
          </a>
          {"  "}
          puedes consultar la documentación interactiva de los endpoints de la
          API.
        </p>
        <a
          href="/scalar"
          target="_blank"
          rel="noopener noreferrer"
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
          title: "Sin API keys",
          description:
            "Crea tu primera API key para autenticar integraciones externas.",
          ctaLabel: "Nueva API key",
          onCta: openCreateModal,
          icon: <KeyRound className="size-5" />,
        }}
      >
        {(items) => (
          <ApiKeyList
            apiKeys={items}
            onDelete={handleDelete}
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
