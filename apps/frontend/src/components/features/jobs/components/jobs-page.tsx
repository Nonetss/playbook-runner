import { BriefcaseIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { JobCard } from "@/components/features/jobs/components/job-card"
import {
  useJobDelete,
  useJobRun,
  useJobsList,
  useJobToggleEnabled,
} from "@/components/features/jobs/hooks/useJobs"
import type { Job } from "@/components/features/jobs/types"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { navigate } from "@/lib/navigate"
import { notifyError } from "@/lib/toast"

function JobsPageInner() {
  const { t } = useTranslation("jobs")
  const { t: tCommon } = useTranslation("common")
  const { data: jobs = [], isPending, isError, refetch } = useJobsList()
  const { data: playbooks = [] } = usePlaybooksList()
  const deleteJob = useJobDelete()
  const toggleEnabled = useJobToggleEnabled()
  const runJob = useJobRun()
  const confirm = useConfirm()

  const playbookMap = Object.fromEntries(playbooks.map((p) => [p.id, p.name]))

  async function handleRunNow(job: Job) {
    if (!job.playbookId) return
    await runJob.mutateAsync({ id: job.id })
    navigate(`/jobs/${job.id}`)
  }

  async function handleDelete(id: string) {
    const job = jobs.find((j) => j.id === id)
    const label = job?.name ?? tCommon("labels.this_job")
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    try {
      await deleteJob.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("delete.error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  async function handleToggleEnabled(id: string, enabled: boolean) {
    try {
      await toggleEnabled.mutateAsync({ id, enabled })
    } catch (err) {
      notifyError(
        t("toggle_error"),
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
      title={t("page.title")}
      description={t("page.subtitle")}
      createLabel={t("page.create")}
      createHref="/jobs/new"
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        items={jobs}
        empty={{
          icon: <BriefcaseIcon className="size-5" />,
          title: t("empty.title"),
          description: t("empty.description"),
          ctaLabel: t("page.create"),
          ctaHref: "/jobs/new",
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
                onDelete={handleDelete}
                onRun={handleRunNow}
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
