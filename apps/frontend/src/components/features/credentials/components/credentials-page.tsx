import { Plus } from "lucide-react"
import { useState } from "react"
import { CredentialFormModal } from "@/components/features/credentials/components/credential-form-modal"
import { CredentialList } from "@/components/features/credentials/components/credential-list"
import {
  useCredentialDelete,
  useCredentialsList,
} from "@/components/features/credentials/hooks/useCredentials"
import type { Credential } from "@/components/features/credentials/types"
import { QueryProvider } from "@/components/providers/query-provider"
import { Button } from "@/components/ui/button"

function CredentialsPageInner() {
  const { data: credentials = [], isPending, isError } = useCredentialsList()
  const deleteCredential = useCredentialDelete()

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
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${label}"? Esta acción no se puede deshacer.`
    )

    if (!confirmed) return

    try {
      await deleteCredential.mutateAsync({ id })
    } catch {
      window.alert("No se pudo eliminar la credencial.")
    }
  }

  return (
    <main className="mx-auto max-w-5xl flex-1 p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credenciales</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona tus claves SSH para despliegues y automatización.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Nueva credencial
        </Button>
      </div>

      {isPending ? (
        <p className="text-muted-foreground text-sm">
          Cargando credenciales...
        </p>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar las credenciales.
        </div>
      ) : (
        <CredentialList
          credentials={credentials}
          onCreate={openCreateModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
          deletingId={
            deleteCredential.isPending
              ? (deleteCredential.variables?.id ?? null)
              : null
          }
        />
      )}

      <CredentialFormModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        credential={editingCredential}
      />
    </main>
  )
}

export function CredentialsPage() {
  return (
    <QueryProvider>
      <CredentialsPageInner />
    </QueryProvider>
  )
}
