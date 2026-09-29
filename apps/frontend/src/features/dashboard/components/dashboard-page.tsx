import { getIcon } from "@/lib/icon-registry"

const Activity = getIcon("views", "activity")
const Briefcase = getIcon("resources", "briefcase")
const ChevronRight = getIcon("controls", "right")
const Plus = getIcon("actions", "add")

import { type ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { StateCard } from "@/components/shared/feedback/state-card"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { SurfaceCardGrid } from "@/components/shared/navigation/surface-card"
import { EntityList } from "@/components/shared/resource/entity-list"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { useCredentialsList } from "@/features/credentials/hooks/use-credentials"
import { StatTile } from "@/features/dashboard/components/stat-tile"
import { dashboardJobDefinition } from "@/features/dashboard/definitions/dashboard-job.definition"
import { recentRunDefinition } from "@/features/dashboard/definitions/recent-run.definition"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import {
  formatRunDurationMs,
  RunWindowPicker,
} from "@/features/jobs/components/run-widgets"
import {
  useJobRunMetrics,
  useJobRunsAll,
  useJobsList,
} from "@/features/jobs/hooks/use-jobs"
import type { JobRunFeedRow, JobRunMetricsWindow } from "@/features/jobs/types"
import { usePlaybooksList } from "@/features/playbooks/hooks/use-playbooks"
import { authClient } from "@/lib/auth-client"

function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <Text as="h2" variant="label" tone="muted">
        {title}
      </Text>
      {action}
    </div>
  )
}

function SectionLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <AppLink
      href={href}
      className="-my-2 inline-flex items-center gap-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground pointer-coarse:-my-3 pointer-coarse:py-3"
    >
      {children}
      <ChevronRight className="size-3.5" />
    </AppLink>
  )
}

function DashboardPageInner() {
  const { data: session } = authClient.useSession()
  const user = session?.user
  const { t, i18n } = useTranslation("dashboard")
  const { t: tJobs } = useTranslation("jobs")
  const { t: tCommon } = useTranslation("common")

  const { data: jobs = [], isPending: jobsPending } = useJobsList()
  const { data: playbooks = [], isPending: playbooksPending } =
    usePlaybooksList()
  const { data: devices = [], isPending: devicesPending } = useDevicesList()
  const { data: groups = [], isPending: groupsPending } = useGroupsList()
  const { data: credentials = [], isPending: credentialsPending } =
    useCredentialsList()

  const [runWindow, setRunWindow] = useState<JobRunMetricsWindow>("24h")
  // Live-polled so a freshly-triggered job updates the figures without refresh.
  const { data: metrics } = useJobRunMetrics(runWindow, { live: true })
  const { data: activityData } = useJobRunsAll({ live: true })

  const playbookNames = new Map(playbooks.map((p) => [p.id, p.name]))
  const enabledJobs = jobs.filter((j) => j.enabled).length
  const scheduledJobs = jobs.filter((j) => j.cronExpression).length
  const isPending =
    jobsPending ||
    playbooksPending ||
    devicesPending ||
    groupsPending ||
    credentialsPending

  const activityRuns: JobRunFeedRow[] =
    activityData?.pages.flatMap((p) => p.runs).slice(0, 8) ?? []
  const successPct = metrics ? Math.round(metrics.successRate * 100) : null

  return (
    <PageShell>
      <PageHero
        surface="dashboard"
        title={t("page.title", {
          name: user?.name ? `, ${user.name}` : "",
        })}
        description={t("page.subtitle")}
        action={
          <Button asChild>
            <AppLink href="/jobs/new">
              <Plus className="size-4" />
              {t("page.new_job_cta")}
            </AppLink>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          title={t("stats.jobs")}
          value={isPending ? "—" : jobs.length}
          sub={
            isPending
              ? undefined
              : `${enabledJobs} ${t("stats.active", { count: enabledJobs })} · ${scheduledJobs} ${t("stats.scheduled", { count: scheduledJobs })}`
          }
          href="/jobs/scheduler"
        />
        <StatTile
          title={t("stats.playbooks")}
          value={isPending ? "—" : playbooks.length}
          href="/playbooks"
        />
        <StatTile
          title={t("stats.devices")}
          value={isPending ? "—" : devices.length}
          sub={
            isPending
              ? undefined
              : `${groups.length} ${t("stats.groups_label", { count: groups.length })}`
          }
          href="/inventory/devices"
        />
        <StatTile
          title={t("stats.credentials")}
          value={isPending ? "—" : credentials.length}
          href="/inventory/credentials"
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t("runs_metrics.title")}
          action={<RunWindowPicker value={runWindow} onChange={setRunWindow} />}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            title={t("stats.success_rate")}
            value={
              successPct == null ? (metrics ? "0%" : "—") : `${successPct}%`
            }
            sub={metrics ? `${metrics.okCount}/${metrics.total}` : undefined}
            href="/jobs/history"
          />
          <StatTile
            title={t("stats.runs_in_window")}
            value={metrics ? metrics.total : "—"}
            sub={
              metrics
                ? `${t("stats.avg_duration")} ${formatRunDurationMs(metrics.avgDurationMs)}`
                : undefined
            }
            href="/jobs/history"
          />
          <StatTile
            title={t("stats.failures")}
            value={metrics ? metrics.failedCount : "—"}
            sub={
              metrics && metrics.total > 0
                ? `${Math.round((metrics.failedCount / metrics.total) * 100)}%`
                : undefined
            }
            href="/jobs/history"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={tJobs("dashboard_activity.title")}
          action={
            <SectionLink href="/jobs/history">
              {tJobs("dashboard_activity.view_history")}
            </SectionLink>
          }
        />
        {activityData == null ? (
          <StateCard spinner title={tCommon("actions.loading")} />
        ) : activityRuns.length === 0 ? (
          <StateCard
            icon={<Activity />}
            title={tJobs("dashboard_activity.empty")}
          />
        ) : (
          <EntityList
            items={activityRuns}
            definition={recentRunDefinition}
            context={{ tJobs, language: i18n.language }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t("jobs_section.title")}
          action={
            <SectionLink href="/jobs/scheduler">
              {t("jobs_section.view_all")}
            </SectionLink>
          }
        />
        {jobsPending ? (
          <StateCard spinner title={tCommon("actions.loading")} />
        ) : jobs.length === 0 ? (
          <StateCard
            icon={<Briefcase />}
            title={t("jobs_section.empty_title")}
            description={t("jobs_section.empty_description")}
            action={
              <Button asChild variant="outline">
                <AppLink href="/jobs/new">
                  <Plus className="size-4" />
                  {t("jobs_section.create_job")}
                </AppLink>
              </Button>
            }
          />
        ) : (
          <EntityList
            items={jobs.slice(0, 8)}
            definition={dashboardJobDefinition}
            context={{ t, playbookNames }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title={t("quick_links.title")} />
        {/* Three shortcuts share the full row instead of leaving the 4/5-column
            grid's trailing tracks empty on desktop. */}
        <SurfaceCardGrid
          surfaces={["playbooks", "devices", "credentials"]}
          className="sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 min-[120rem]:grid-cols-3"
        />
      </section>
    </PageShell>
  )
}

export function DashboardPage() {
  return (
    <AppProviders>
      <DashboardPageInner />
    </AppProviders>
  )
}
