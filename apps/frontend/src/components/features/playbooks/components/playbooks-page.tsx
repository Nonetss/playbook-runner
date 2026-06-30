"use client"

import { BookText } from "lucide-react"
import { PlaybookList } from "@/components/features/playbooks/components/playbook-list"
import {
  usePlaybookDelete,
  usePlaybooksList,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import type { Playbook } from "@/components/features/playbooks/types"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

function PlaybooksPageInner() {
  const {
    data: playbooks = [],
    isPending,
    isError,
    refetch,
  } = usePlaybooksList()
  const deletePlaybook = usePlaybookDelete()
  const confirm = useConfirm()

  function goToRun(playbook: Playbook) {
    window.location.href = `/playbooks/${playbook.id}/run`
  }

  function goToCreate() {
    window.location.href = "/playbooks/new"
  }

  function goToEdit(playbook: Playbook) {
    window.location.href = `/playbooks/${playbook.id}/edit`
  }

  async function handleDelete(id: string) {
    const playbook = playbooks.find((item) => item.id === id)
    const label = playbook?.name ?? "este playbook"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deletePlaybook.mutateAsync({ id })
    } catch (err) {
      notifyError(
        "No se pudo eliminar el playbook",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title="Playbooks"
      description="Gestiona tus playbooks de Ansible para automatizar despliegues y tareas."
      createLabel="Nuevo playbook"
      onCreate={goToCreate}
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={playbooks}
        empty={{
          title: "Sin playbooks",
          description:
            "Crea tu primer playbook para empezar a automatizar tus tareas.",
          ctaLabel: "Nuevo playbook",
          onCta: goToCreate,
          icon: <BookText className="size-5" />,
        }}
      >
        {(items) => (
          <PlaybookList
            playbooks={items}
            onEdit={goToEdit}
            onDelete={handleDelete}
            onRun={goToRun}
            deletingId={
              deletePlaybook.isPending
                ? (deletePlaybook.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function PlaybooksPage() {
  return (
    <AppProviders>
      <PlaybooksPageInner />
    </AppProviders>
  )
}
