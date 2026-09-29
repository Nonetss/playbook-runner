import { getIcon } from "@/lib/icon-registry"

const KeyRound = getIcon("resources", "apiKey")
const Plus = getIcon("actions", "add")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { CredentialFormModal } from "@/features/credentials/components/credential-form-modal"
import { ProvisionScriptDialog } from "@/features/credentials/components/provision-script-dialog"
import { credentialDefinition } from "@/features/credentials/definitions/credential.definition"
import {
  useCredentialDelete,
  useCredentialsList,
} from "@/features/credentials/hooks/use-credentials"
import type { Credential } from "@/features/credentials/types"
import { useConfirm } from "@/hooks/use-confirm"

function CredentialsPageInner() {
  const { t, i18n } = useTranslation("credentials")
  const { t: tCommon } = useTranslation("common")
  const query = useCredentialsList()
  const deleteCredential = useCredentialDelete()
  const confirm = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(
    null
  )
  const [provisionTarget, setProvisionTarget] = useState<Credential | null>(
    null
  )

  function openCreateModal() {
    setEditingCredential(null)
    setModalOpen(true)
  }

  function openEditModal(credential: Credential) {
    setEditingCredential(credential)
    setModalOpen(true)
  }

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open)
    if (!open) setEditingCredential(null)
  }

  async function handleDelete(credential: Credential) {
    const confirmed = await confirm({
      title: t("delete.confirm_title", {
        label: credential.name || t("delete.fallback_label"),
      }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deleteCredential.mutate({ id: credential.id })
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
        surface="credentials"
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
        query={query}
        isEmpty={(credentials) => credentials.length === 0}
        empty={{
          icon: <KeyRound />,
          title: t("empty.title"),
          description: t("empty.description"),
          action: createButton,
        }}
      >
        {(credentials) => (
          <EntityCardGrid
            items={credentials}
            definition={credentialDefinition}
            context={{
              t,
              tCommon,
              language: i18n.language,
              deletingId: deleteCredential.isPending
                ? (deleteCredential.variables?.id ?? null)
                : null,
              onEdit: openEditModal,
              onDelete: handleDelete,
              onProvision: setProvisionTarget,
            }}
          />
        )}
      </ResourceOverview>

      <CredentialFormModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        credential={editingCredential}
      />
      <ProvisionScriptDialog
        open={!!provisionTarget}
        onOpenChange={(open) => {
          if (!open) setProvisionTarget(null)
        }}
        credential={provisionTarget}
      />
    </>
  )
}

export function CredentialsPage() {
  return (
    <AppProviders>
      <CredentialsPageInner />
    </AppProviders>
  )
}
