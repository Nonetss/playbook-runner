import { FileCode } from "lucide-react"
import { ScriptList } from "@/components/features/scripts/components/script-list"
import {
  useScriptDelete,
  useScriptsList,
} from "@/components/features/scripts/hooks/useScripts"
import type { Script } from "@/components/features/scripts/types"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

function ScriptsPageInner() {
  const { data: scripts = [], isPending, isError, refetch } = useScriptsList()
  const deleteScript = useScriptDelete()
  const confirm = useConfirm()

  function goToRun(script: Script) {
    window.location.href = `/scripts/${script.id}/run`
  }

  function goToCreate() {
    window.location.href = "/scripts/new"
  }

  function goToEdit(script: Script) {
    window.location.href = `/scripts/${script.id}/edit`
  }

  async function handleDelete(id: string) {
    const script = scripts.find((item) => item.id === id)
    const label = script?.name ?? "este script"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deleteScript.mutateAsync({ id })
    } catch (err) {
      notifyError(
        "No se pudo eliminar el script",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title="Scripts"
      description="Guarda y ejecuta scripts bash reutilizables contra tu inventario."
      createLabel="Nuevo script"
      onCreate={goToCreate}
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={scripts}
        empty={{
          title: "Sin scripts",
          description:
            "Crea tu primer script bash para automatizar tareas operativas.",
          ctaLabel: "Nuevo script",
          onCta: goToCreate,
          icon: <FileCode className="size-5" />,
        }}
      >
        {(items) => (
          <ScriptList
            scripts={items}
            onEdit={goToEdit}
            onDelete={handleDelete}
            onRun={goToRun}
            deletingId={
              deleteScript.isPending
                ? (deleteScript.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function ScriptsPage() {
  return (
    <AppProviders>
      <ScriptsPageInner />
    </AppProviders>
  )
}
