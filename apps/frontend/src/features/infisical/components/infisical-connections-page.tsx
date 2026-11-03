import { getIcon } from "@/lib/icon-registry"

const Vault = getIcon("resources", "vault")
const Plus = getIcon("actions", "add")

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { InfisicalConnectionFormModal } from "@/features/infisical/components/infisical-connection-form-modal"
import { infisicalConnectionDefinition } from "@/features/infisical/definitions/infisical-connection.definition"
import {
  useInfisicalConnectionDelete,
  useInfisicalConnectionsList,
} from "@/features/infisical/hooks/use-infisical-connections"
import type { InfisicalConnection } from "@/features/infisical/types"
import { useConfirm } from "@/hooks/use-confirm"

function InfisicalConnectionsPageInner() {
  const { t, i18n } = useTranslation("infisical")
  const { t: tCommon } = useTranslation("common")
  const query = useInfisicalConnectionsList()
  const deleteConnection = useInfisicalConnectionDelete()
  const confirm = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InfisicalConnection | null>(null)
  // Set by the navbar search, which opens a connection by its id.
  const [requestedId, setRequestedId] = useState(() =>
    new URLSearchParams(window.location.search).get("edit")
  )

  useEffect(() => {
    if (!requestedId || !query.data) return
    const requested = query.data.find((row) => row.id === requestedId)
    if (requested) {
      setEditing(requested)
      setModalOpen(true)
    }
    setRequestedId(null)
  }, [requestedId, query.data])

  function openCreateModal() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEditModal(connection: InfisicalConnection) {
    setEditing(connection)
    setModalOpen(true)
  }

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open)
    if (!open) setEditing(null)
  }

  async function handleDelete(connection: InfisicalConnection) {
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label: connection.name }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deleteConnection.mutate({ id: connection.id })
  }

  const createButton = (
    <Button onClick={openCreateModal}>
      <Plus className="size-4" />
      {t("page.create")}
    </Button>
  )

  return (
    <>
      <ResourceOverview
        surface="infisical"
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
        filters={
          <InlineAlert tone="muted" title={t("notice.title")}>
            {t("notice.body")}
          </InlineAlert>
        }
        query={query}
        isEmpty={(connections) => connections.length === 0}
        empty={{
          icon: <Vault />,
          title: t("empty.title"),
          description: t("empty.description"),
          action: createButton,
        }}
      >
        {(connections) => (
          <EntityCardGrid
            items={connections}
            definition={infisicalConnectionDefinition}
            context={{
              t,
              tCommon,
              language: i18n.language,
              deletingId: deleteConnection.isPending
                ? (deleteConnection.variables?.id ?? null)
                : null,
              onEdit: openEditModal,
              onDelete: handleDelete,
            }}
          />
        )}
      </ResourceOverview>

      <InfisicalConnectionFormModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        connection={editing}
      />
    </>
  )
}

export function InfisicalConnectionsPage() {
  return (
    <AppProviders>
      <InfisicalConnectionsPageInner />
    </AppProviders>
  )
}
