"use client"

import {
  BriefcaseIcon,
  ChevronRight,
  Clock,
  FileCode2,
  KeyRound,
  Plus,
  Server,
  Users,
} from "lucide-react"
import { useCredentialsList } from "@/components/features/credentials/hooks/useCredentials"
import { useDevicesList } from "@/components/features/inventory/hooks/useDevices"
import { useGroupsList } from "@/components/features/inventory/hooks/useGroups"
import type { Job } from "@/components/features/jobs/types"
import { useJobsList } from "@/components/features/jobs/hooks/useJobs"
import { usePlaybooksList } from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  href,
}: {
  icon: React.ElementType
  title: string
  value: number | string
  sub?: string
  href: string
}) {
  return (
    <a href={href} className="group block">
      <Card className="transition-all group-hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </a>
  )
}

function JobRow({
  job,
  playbookName,
}: {
  job: Job
  playbookName?: string
}) {
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
            {playbookName ?? "Sin playbook"}
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
            Manual
          </Badge>
        )}
        <Badge
          variant={job.enabled ? "default" : "outline"}
          className="text-xs"
        >
          {job.enabled ? "Activo" : "Inactivo"}
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  )
}

function DashboardPageInner() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const { data: jobs = [], isPending: jobsPending } = useJobsList()
  const { data: playbooks = [], isPending: playbooksPending } =
    usePlaybooksList()
  const { data: devices = [], isPending: devicesPending } = useDevicesList()
  const { data: groups = [], isPending: groupsPending } = useGroupsList()
  const { data: credentials = [], isPending: credentialsPending } =
    useCredentialsList()

  const playbookMap = new Map(playbooks.map((p) => [p.id, p.name]))

  const enabledJobs = jobs.filter((j) => j.enabled).length
  const scheduledJobs = jobs.filter((j) => j.cronExpression).length

  const isPending =
    jobsPending ||
    playbooksPending ||
    devicesPending ||
    groupsPending ||
    credentialsPending

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tu entorno de automatización
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <a href="/jobs/new">
            <Plus className="size-4" />
            Nuevo job
          </a>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={BriefcaseIcon}
          title="Jobs"
          value={isPending ? "—" : jobs.length}
          sub={
            isPending
              ? undefined
              : `${enabledJobs} activo${enabledJobs !== 1 ? "s" : ""} · ${scheduledJobs} programado${scheduledJobs !== 1 ? "s" : ""}`
          }
          href="/jobs"
        />
        <StatCard
          icon={FileCode2}
          title="Playbooks"
          value={isPending ? "—" : playbooks.length}
          href="/playbooks"
        />
        <StatCard
          icon={Server}
          title="Dispositivos"
          value={isPending ? "—" : devices.length}
          sub={
            isPending
              ? undefined
              : `${groups.length} grupo${groups.length !== 1 ? "s" : ""}`
          }
          href="/inventory"
        />
        <StatCard
          icon={KeyRound}
          title="Credenciales"
          value={isPending ? "—" : credentials.length}
          href="/credentials"
        />
      </div>

      {/* Jobs list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Jobs</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/jobs" className="gap-1 text-xs text-muted-foreground">
              Ver todos
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
                <p className="text-sm font-medium">No hay jobs todavía</p>
                <p className="text-xs text-muted-foreground">
                  Crea tu primer job para empezar a automatizar
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href="/jobs/new">
                  <Plus className="size-4" />
                  Crear job
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
                    job.playbookId
                      ? playbookMap.get(job.playbookId)
                      : undefined
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
            label: "Nuevo playbook",
            desc: "Escribe un playbook de Ansible",
          },
          {
            href: "/inventory",
            icon: Users,
            label: "Gestionar inventario",
            desc: "Dispositivos y grupos",
          },
          {
            href: "/credentials",
            icon: KeyRound,
            label: "Credenciales SSH",
            desc: "Claves para conectar a hosts",
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
