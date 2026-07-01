import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Play,
  XCircle,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { JobRunOutput } from "@/components/features/jobs/components/job-run-output"
import {
  useJobGet,
  useJobRun,
  useJobRunsList,
} from "@/components/features/jobs/hooks/useJobs"
import type { JobRun, JobRunStatus } from "@/components/features/jobs/types"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(run: JobRun): string {
  if (!run.startedAt) return "—"
  const start = new Date(run.startedAt).getTime()
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now()
  const secs = Math.max(0, Math.round((end - start) / 1000))
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

const STATUS_META: Record<
  JobRunStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pendiente",
    className: "border-zinc-300 text-muted-foreground",
    icon: Clock,
  },
  running: {
    label: "En curso",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-600",
    icon: Loader2,
  },
  ok: {
    label: "Correcto",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    icon: CheckCircle2,
  },
  failed: {
    label: "Fallido",
    className: "border-red-500/40 bg-red-500/10 text-red-600",
    icon: XCircle,
  },
}

function StatusBadge({ status }: { status: JobRunStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1", meta.className)}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {meta.label}
    </Badge>
  )
}

function JobDetailPageInner({ id }: { id: string }) {
  const { data: job, isPending: jobLoading, isError } = useJobGet(id)
  const runJob = useJobRun()

  const { data: runs = [], isPending: runsLoading } = useJobRunsList(id, {
    // Poll while anything is running so the status flips without a refresh.
    live: true,
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Default selection: keep the newest run focused as the list updates.
  useEffect(() => {
    if (runs.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !runs.some((r) => r.id === selectedId)) {
      setSelectedId(runs[0].id)
    }
  }, [runs, selectedId])

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? null,
    [runs, selectedId]
  )

  async function handleRunNow() {
    await runJob.mutateAsync({ id })
  }

  if (jobLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando job…
        </div>
      </main>
    )
  }

  if (isError || !job) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el job.
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/jobs">
            <ArrowLeft className="size-4" />
            Volver a jobs
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="w-full flex-1 p-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
            <a href="/jobs">
              <ArrowLeft className="size-4" />
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.name}</h1>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-sm">
              {job.cronExpression ? (
                <Badge variant="secondary" className="gap-1 font-mono text-xs">
                  <Clock className="size-3" />
                  {job.cronExpression}
                </Badge>
              ) : (
                <span>Ejecución manual</span>
              )}
              {!job.enabled ? (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  Desactivado
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <a href={`/jobs/${job.id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </a>
          </Button>
          <Button
            onClick={handleRunNow}
            disabled={runJob.isPending || !job.playbookId}
          >
            {runJob.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Ejecutar ahora
          </Button>
        </div>
      </div>

      {/* Body: history + output */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* History list */}
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            Historial
          </h2>

          {runsLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando…
            </div>
          ) : runs.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">
                Aún no hay ejecuciones. Pulsa{" "}
                <span className="font-medium">Ejecutar ahora</span> o espera a
                la próxima ejecución programada.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => {
                const active = run.id === selectedId
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(run.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-accent"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={run.status} />
                        <span className="text-muted-foreground text-xs">
                          {run.trigger === "schedule" ? "Programado" : "Manual"}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span>
                          {formatDateTime(run.startedAt ?? run.createdAt)}
                        </span>
                        <span className="font-mono">{formatDuration(run)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Selected run output */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Salida
            </h2>
            {selectedRun ? <StatusBadge status={selectedRun.status} /> : null}
          </div>

          {selectedRun ? (
            <>
              {selectedRun.error ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{selectedRun.error}</span>
                </div>
              ) : null}
              <JobRunOutput
                events={selectedRun.eventsJson ?? []}
                running={selectedRun.status === "running"}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-card px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                Selecciona una ejecución para ver su salida.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export function JobDetailPage({ id }: { id?: string }) {
  if (!id) {
    return (
      <AppProviders>
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">Job no encontrado.</p>
        </main>
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <JobDetailPageInner id={id} />
    </AppProviders>
  )
}
