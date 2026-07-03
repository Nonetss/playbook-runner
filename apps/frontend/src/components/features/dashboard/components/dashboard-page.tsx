import {
  ActivityIcon,
  BriefcaseIcon,
  ChevronRight,
  Clock,
  FileCode2,
  KeyRound,
  Plus,
  Server,
  Timer,
  Users,
  XCircle,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCredentialsList } from "@/components/features/credentials/hooks/useCredentials"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import {
  formatRunDurationMs,
  formatRunTimestamp,
  RunStatusBadge,
  RunWindowPicker,
} from "@/components/features/jobs/components/run-widgets"
import {
  useJobRunMetrics,
  useJobRunsAll,
  useJobsList,
} from "@/components/features/jobs/hooks/useJobs"
import type {
  Job,
  JobRunFeedRow,
  JobRunMetricsWindow,
} from "@/components/features/jobs/types"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/ui/stat-card"
import { authClient } from "@/lib/auth-client"

function JobRow({ job, playbookName }: { job: Job; playbookName?: string }) {
  const { t } = useTranslation("dashboard")
  return (
    <a
      href={`/jobs/${job.id}`}
      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <BriefcaseIcon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{job.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {playbookName ?? t("job_row.no_playbook")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {job.cronExpression ? (
          <Badge
            variant="secondary"
            className="hidden gap-1 font-mono text-xs sm:flex"
          >
            <Clock className="size-3" />
            {job.cronExpression}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="hidden text-xs text-muted-foreground sm:flex"
          >
            {t("job_row.manual")}
          </Badge>
        )}
        <Badge
          variant={job.enabled ? "default" : "outline"}
          className="text-xs"
        >
          {job.enabled ? t("job_row.active") : t("job_row.inactive")}
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  )
}

function ActivityRow({ run }: { run: JobRunFeedRow }) {
  const { t } = useTranslation("jobs")
  const href = run.jobId ? `/jobs/${run.jobId}?run=${run.id}` : "/history"
  return (
    <a
      href={href}
      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex min-w-0 items-center gap-2">
        <RunStatusBadge status={run.status} />
        <span className="truncate text-sm">
          {run.jobName ?? t("history.deleted_job")}
        </span>
      </div>
      <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
        <span className="font-mono">{formatRunDurationMs(run.durationMs)}</span>
        <span className="font-mono hidden sm:inline">
          {formatRunTimestamp(run.startedAt ?? run.createdAt)}
        </span>
        <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  )
}

function DashboardPageInner() {
  const { data: session } = authClient.useSession()
  const user = session?.user
  const { t } = useTranslation("dashboard")

  const { data: jobs = [], isPending: jobsPending } = useJobsList()
  const { data: playbooks = [], isPending: playbooksPending } =
    usePlaybooksList()
  const { data: devices = [], isPending: devicesPending } = useDevicesList()
  const { data: groups = [], isPending: groupsPending } = useGroupsList()
  const { data: credentials = [], isPending: credentialsPending } =
    useCredentialsList()

  const [runWindow, setRunWindow] = useState<JobRunMetricsWindow>("24h")
  // Live-polled so a freshly-triggered job updates the cards without refresh.
  const { data: metrics } = useJobRunMetrics(runWindow, { live: true })
  const { data: activityData } = useJobRunsAll({ live: true })

  const playbookMap = new Map(playbooks.map((p) => [p.id, p.name]))

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
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("page.title", {
              name: user?.name ? `, ${user.name}` : "",
            })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.subtitle")}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <a href="/jobs/new">
            <Plus className="size-4" />
            {t("page.new_job_cta")}
          </a>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={BriefcaseIcon}
          title={t("stats.jobs")}
          value={isPending ? "—" : jobs.length}
          sub={
            isPending
              ? undefined
              : `${enabledJobs} ${t("stats.active", { count: enabledJobs })} · ${scheduledJobs} ${t("stats.scheduled", { count: scheduledJobs })}`
          }
          href="/jobs"
        />
        <StatCard
          icon={FileCode2}
          title={t("stats.playbooks")}
          value={isPending ? "—" : playbooks.length}
          href="/playbooks"
        />
        <StatCard
          icon={Server}
          title={t("stats.devices")}
          value={isPending ? "—" : devices.length}
          sub={
            isPending
              ? undefined
              : `${groups.length} ${t("stats.groups_label", { count: groups.length })}`
          }
          href="/inventory"
        />
        <StatCard
          icon={KeyRound}
          title={t("stats.credentials")}
          value={isPending ? "—" : credentials.length}
          href="/credentials"
        />
      </div>

      {/* Run metrics + window selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {t("runs_metrics.title", { defaultValue: "Run metrics" })}
          </h2>
          <RunWindowPicker value={runWindow} onChange={setRunWindow} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={ActivityIcon}
            title={t("stats.success_rate")}
            value={
              successPct == null ? (metrics ? "0%" : "—") : `${successPct}%`
            }
            sub={
              metrics
                ? `${metrics.okCount}/${metrics.total} ${t("stats.avg_duration").toLowerCase()}`
                : undefined
            }
            href="/history"
          />
          <StatCard
            icon={Timer}
            title={t("stats.runs_in_window")}
            value={metrics ? metrics.total : "—"}
            sub={
              metrics
                ? `${formatRunDurationMs(metrics.avgDurationMs)} ${t("stats.avg_duration").toLowerCase()}`
                : undefined
            }
            href="/history"
          />
          <StatCard
            icon={XCircle}
            title={t("stats.failures")}
            value={metrics ? metrics.failedCount : "—"}
            sub={
              metrics && metrics.total > 0
                ? `${Math.round((metrics.failedCount / metrics.total) * 100)}%`
                : undefined
            }
            href="/history"
          />
        </div>
      </section>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ActivityIcon className="size-4" />
            {t("dashboard_activity.title", { ns: "jobs" })}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/history" className="gap-1 text-xs text-muted-foreground">
              {t("dashboard_activity.view_history", { ns: "jobs" })}
              <ChevronRight className="size-3.5" />
            </a>
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {activityData == null ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : activityRuns.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("dashboard_activity.empty", { ns: "jobs" })}
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {activityRuns.map((run) => (
                <ActivityRow key={run.id} run={run} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">
            {t("jobs_section.title")}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/jobs" className="gap-1 text-xs text-muted-foreground">
              {t("jobs_section.view_all")}
              <ChevronRight className="size-3.5" />
            </a>
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {jobsPending ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <BriefcaseIcon className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {t("jobs_section.empty_title")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("jobs_section.empty_description")}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/jobs/new">
                  <Plus className="size-4" />
                  {t("jobs_section.create_job")}
                </a>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {jobs.slice(0, 8).map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  playbookName={
                    job.playbookId ? playbookMap.get(job.playbookId) : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            href: "/playbooks/new",
            icon: FileCode2,
            label: t("quick_links.new_playbook_title"),
            desc: t("quick_links.new_playbook_desc"),
          },
          {
            href: "/inventory",
            icon: Users,
            label: t("quick_links.manage_inventory_title"),
            desc: t("quick_links.manage_inventory_desc"),
          },
          {
            href: "/credentials",
            icon: KeyRound,
            label: t("quick_links.ssh_credentials_title"),
            desc: t("quick_links.ssh_credentials_desc"),
          },
        ].map(({ href, icon: Icon, label, desc }) => (
          <a key={href} href={href} className="group block">
            <Card className="h-full transition-all group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 pt-5">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </main>
  )
}

export function DashboardPage() {
  return (
    <AppProviders>
      <DashboardPageInner />
    </AppProviders>
  )
}
