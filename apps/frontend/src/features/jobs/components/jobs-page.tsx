import { getIcon } from "@/lib/icon-registry"

const BriefcaseIcon = getIcon("resources", "briefcase")
const Plus = getIcon("actions", "add")

import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { jobDefinition } from "@/features/jobs/definitions/job.definition"
import {
  useJobDelete,
  useJobRun,
  useJobRunRollups,
  useJobsList,
  useJobToggleEnabled,
} from "@/features/jobs/hooks/use-jobs"
import type { Job, JobRollup } from "@/features/jobs/types"
import { usePlaybooksList } from "@/features/playbooks/hooks/use-playbooks"
import { useConfirm } from "@/hooks/use-confirm"
import { navigate } from "@/lib/navigate"

function JobsPageInner() {
  const { t, i18n } = useTranslation("jobs")
  const { t: tCommon } = useTranslation("common")
  const query = useJobsList()
  const { data: playbooks = [] } = usePlaybooksList()
  const { data: rollups = [] } = useJobRunRollups({ live: true })
  const deleteJob = useJobDelete()
  const toggleEnabled = useJobToggleEnabled()
  const runJob = useJobRun()
  const confirm = useConfirm()

  const jobs = query.data ?? []
  const activeCount = jobs.filter((job) => job.enabled).length

  async function handleRunNow(job: Job) {
    if (!job.playbookId) return
    const confirmed = await confirm({
      title: t("run_now.confirm_title", { name: job.name }),
      description: t("run_now.confirm_description", {
        targets: job.inventoryJson?.length ?? 0,
        forks: job.forks,
      }),
      confirmLabel: t("run_now.confirm"),
      cancelLabel: tCommon("actions.cancel"),
    })
    if (!confirmed) return

    let runId: string | null
    try {
      ;({ runId } = await runJob.mutateAsync({ id: job.id }))
    } catch {
      return // useJobRun already showed the error toast (e.g. already running).
    }
    navigate(runId ? `/jobs/${job.id}?run=${runId}` : `/jobs/${job.id}`)
  }

  async function handleDelete(job: Job) {
    const confirmed = await confirm({
      title: t("delete.confirm_title", {
        label: job.name || tCommon("labels.this_job"),
      }),
      description: t("delete.confirm_description"),
      confirmLabel: tCommon("actions.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deleteJob.mutate({ id: job.id })
  }

  const createButton = (
    <Button asChild>
      <AppLink href="/jobs/new">
        <Plus className="size-4" />
        {t("page.create")}
      </AppLink>
    </Button>
  )

  return (
    <ResourceOverview
      surface="scheduler"
      heroMeta={
        <HeroCount
          segments={[
            { count: activeCount, label: t("list.active").toLowerCase() },
            { count: jobs.length, label: tCommon("labels.total") },
          ]}
        />
      }
      heroAction={createButton}
      query={query}
      isEmpty={(items) => items.length === 0}
      empty={{
        icon: <BriefcaseIcon />,
        title: t("empty.title"),
        description: t("empty.description"),
        action: createButton,
      }}
    >
      {(items) => (
        <EntityCardGrid
          items={items}
          definition={jobDefinition}
          context={{
            t,
            tCommon,
            language: i18n.language,
            playbookNames: Object.fromEntries(
              playbooks.map((playbook) => [playbook.id, playbook.name])
            ),
            rollups: Object.fromEntries(
              (rollups as JobRollup[]).map((rollup) => [rollup.jobId, rollup])
            ),
            deletingId: deleteJob.isPending
              ? ((deleteJob.variables as { id: string } | undefined)?.id ??
                null)
              : null,
            togglingId: toggleEnabled.isPending
              ? ((toggleEnabled.variables as { id: string } | undefined)?.id ??
                null)
              : null,
            onRun: handleRunNow,
            // The mutation hook shows the error toast.
            onToggleEnabled: (job, enabled) =>
              toggleEnabled.mutate({ id: job.id, enabled }),
            onDelete: handleDelete,
          }}
        />
      )}
    </ResourceOverview>
  )
}

export function JobsPage() {
  return (
    <AppProviders>
      <JobsPageInner />
    </AppProviders>
  )
}
