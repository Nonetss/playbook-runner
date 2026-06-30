"use client"

import { BriefcaseIcon } from "lucide-react"
import { JobCard } from "@/components/features/jobs/components/job-card"
import {
  useJobDelete,
  useJobsList,
  useJobToggleEnabled,
} from "@/components/features/jobs/hooks/useJobs"
import type { Job } from "@/components/features/jobs/types"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

function JobsPageInner() {
  const { data: jobs = [], isPending, isError, refetch } = useJobsList()
  const { data: playbooks = [] } = usePlaybooksList()
  const deleteJob = useJobDelete()
  const toggleEnabled = useJobToggleEnabled()
  const confirm = useConfirm()

  const playbookMap = Object.fromEntries(playbooks.map((p) => [p.id, p.name]))

  function goToCreate() {
    window.location.href = "/jobs/new"
  }

  function goToEdit(job: Job) {
    window.location.href = `/jobs/${job.id}/edit`
  }

  function goToRun(job: Job) {
    if (!job.playbookId) return
    window.location.href = `/playbooks/${job.playbookId}/run`
  }

  async function handleDelete(id: string) {
    const job = jobs.find((j) => j.id === id)
    const label = job?.name ?? "este job"
    const confirmed = await confirm({
      title: `Eliminar "${label}"`,
      description:
        "Esta acción eliminará el job y su historial de ejecuciones. No se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    })
    if (!confirmed) return
    try {
      await deleteJob.mutateAsync({ id })
    } catch (err) {
      notifyError(
        "No se pudo eliminar el job",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleToggleEnabled(id: string, enabled: boolean) {
    try {
      await toggleEnabled.mutateAsync({ id, enabled })
    } catch (err) {
      notifyError(
        "No se pudo cambiar el estado del job",
        err instanceof Error ? err.message : undefined
      )
    }
  }

  const isDeletingId = deleteJob.isPending
    ? (deleteJob.variables as { id: string })?.id
    : null
  const isTogglingId = toggleEnabled.isPending
    ? (toggleEnabled.variables as { id: string })?.id
    : null

  return (
    <ResourcePage
      title="Jobs"
      description="Tareas programadas de playbooks para ejecutarse manual o automáticamente."
      createLabel="Nuevo job"
      onCreate={goToCreate}
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        items={jobs}
        empty={{
          icon: <BriefcaseIcon className="size-6" />,
          title: "Sin jobs",
          description:
            "Crea un job para programar la ejecución de un playbook.",
          ctaLabel: "Crear job",
          onCta: goToCreate,
        }}
      >
        {(items) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                playbookName={
                  job.playbookId ? playbookMap[job.playbookId] : undefined
                }
                onEdit={goToEdit}
                onDelete={handleDelete}
                onRun={goToRun}
                onToggleEnabled={handleToggleEnabled}
                isDeleting={isDeletingId === job.id}
                isTogglingEnabled={isTogglingId === job.id}
              />
            ))}
          </div>
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function JobsPage() {
  return (
    <AppProviders>
      <JobsPageInner />
    </AppProviders>
  )
}
