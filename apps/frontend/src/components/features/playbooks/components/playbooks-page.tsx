import { Plus } from "lucide-react"
import { useState } from "react"
import { PlaybookFormModal } from "@/components/features/playbooks/components/playbook-form-modal"
import { PlaybookList } from "@/components/features/playbooks/components/playbook-list"
import {
  usePlaybookDelete,
  usePlaybooksList,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import type { Playbook } from "@/components/features/playbooks/types"
import { QueryProvider } from "@/components/providers/query-provider"
import { Button } from "@/components/ui/button"

function PlaybooksPageInner() {
  const { data: playbooks = [], isPending, isError } = usePlaybooksList()
  const deletePlaybook = usePlaybookDelete()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null)

  function openCreateModal() {
    setEditingPlaybook(null)
    setModalOpen(true)
  }

  function openEditModal(playbook: Playbook) {
    setEditingPlaybook(playbook)
    setModalOpen(true)
  }

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open)
    if (!open) {
      setEditingPlaybook(null)
    }
  }

  async function handleDelete(id: string) {
    const playbook = playbooks.find((item) => item.id === id)
    const label = playbook?.name ?? "este playbook"
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${label}"? Esta acción no se puede deshacer.`
    )

    if (!confirmed) return

    try {
      await deletePlaybook.mutateAsync({ id })
    } catch {
      window.alert("No se pudo eliminar el playbook.")
    }
  }

  return (
    <main className="mx-auto max-w-5xl flex-1 p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Playbooks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona tus playbooks de Ansible para automatizar despliegues y
            tareas.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Nuevo playbook
        </Button>
      </div>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Cargando playbooks...</p>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudieron cargar los playbooks.
        </div>
      ) : (
        <PlaybookList
          playbooks={playbooks}
          onCreate={openCreateModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
          deletingId={
            deletePlaybook.isPending
              ? (deletePlaybook.variables?.id ?? null)
              : null
          }
        />
      )}

      <PlaybookFormModal
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        playbook={editingPlaybook}
      />
    </main>
  )
}

export function PlaybooksPage() {
  return (
    <QueryProvider>
      <PlaybooksPageInner />
    </QueryProvider>
  )
}