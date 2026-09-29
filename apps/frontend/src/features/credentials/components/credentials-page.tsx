import { getIcon } from "@/lib/icon-registry"

const KeyRound = getIcon("resources", "apiKey")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useIsAdmin } from "@/features/auth"
import { CredentialFormModal } from "@/features/credentials/components/credential-form-modal"
import { CredentialList } from "@/features/credentials/components/credential-list"
import {
  useCredentialDelete,
  useCredentialsList,
} from "@/features/credentials/hooks/use-credentials"
import type { Credential } from "@/features/credentials/types"
import { useConfirm } from "@/hooks/use-confirm"

function CredentialsPageInner() {
  const { t } = useTranslation("credentials")
  const { t: tCommon } = useTranslation("common")
  const {
    data: credentials = [],
    isPending,
    isError,
    refetch,
  } = useCredentialsList()
  const deleteCredential = useCredentialDelete()
  const confirm = useConfirm()
  const isAdmin = useIsAdmin()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(
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
    if (!open) {
      setEditingCredential(null)
    }
  }

  async function handleDelete(id: string) {
    const credential = credentials.find((item) => item.id === id)
    const label = credential?.name ?? t("delete.fallback_label")
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    // The mutation hook shows the error toast.
    deleteCredential.mutate({ id })
  }

  return (
    <ResourcePage
      title={t("page.title")}
      description={t("page.subtitle")}
      createLabel={t("page.create")}
      onCreate={openCreateModal}
      hideCreate={!isAdmin}
    >
      <CredentialFormModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        credential={editingCredential}
      />

      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={credentials}
        empty={{
          title: t("empty.title"),
          description: t("empty.description"),
          ...(isAdmin
            ? { ctaLabel: t("page.create"), onCta: openCreateModal }
            : {}),
          icon: <KeyRound className="size-5" />,
        }}
      >
        {(items) => (
          <CredentialList
            credentials={items}
            onEdit={isAdmin ? openEditModal : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            deletingId={
              deleteCredential.isPending
                ? (deleteCredential.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function CredentialsPage() {
  return (
    <AppProviders>
      <CredentialsPageInner />
    </AppProviders>
  )
}
