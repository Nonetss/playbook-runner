import { KeyRound } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CredentialFormModal } from "@/components/features/credentials/components/credential-form-modal"
import { CredentialList } from "@/components/features/credentials/components/credential-list"
import {
  useCredentialDelete,
  useCredentialsList,
} from "@/components/features/credentials/hooks/useCredentials"
import type { Credential } from "@/components/features/credentials/types"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

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

  async function handleDelete(id: number) {
    const credential = credentials.find((item) => item.id === id)
    const label = credential?.name ?? "esta credencial"
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deleteCredential.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("delete.error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title={t("page.title")}
      description={t("page.subtitle")}
      createLabel={t("page.create")}
      onCreate={openCreateModal}
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
          ctaLabel: t("page.create"),
          onCta: openCreateModal,
          icon: <KeyRound className="size-5" />,
        }}
      >
        {(items) => (
          <CredentialList
            credentials={items}
            onEdit={openEditModal}
            onDelete={handleDelete}
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
