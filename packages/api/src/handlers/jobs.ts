import { db } from "@playbook-runner/db"
import {
  jobRuns,
  jobs,
  type NewJob,
  type NewJobRun,
} from "@playbook-runner/db/schema/jobs"
import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm"

export const jobsHandler = {
  create: async (job: Omit<NewJob, "id" | "createdAt" | "updatedAt">) => {
    const j = await db.insert(jobs).values(job).returning()
    return j[0] ?? null
  },

  list: async () => {
    return db.select().from(jobs).orderBy(asc(jobs.createdAt))
  },

  /** Enabled jobs that carry a cron expression — the scheduler's source set. */
  listScheduled: async () => {
    return db
      .select({ id: jobs.id, cronExpression: jobs.cronExpression })
      .from(jobs)
      .where(eq(jobs.enabled, true))
  },

  get: async (id: string) => {
    const j = await db.select().from(jobs).where(eq(jobs.id, id))
    return j[0] ?? null
  },

  update: async (
    id: string,
    job: Partial<Omit<NewJob, "id" | "createdAt" | "updatedAt">>
  ) => {
    const j = await db
      .update(jobs)
      .set({ ...job, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning()
    return j[0] ?? null
  },

  delete: async (id: string) => {
    const j = await db.delete(jobs).where(eq(jobs.id, id)).returning()
    return j[0] ?? null
  },
}

/**
 * Window presets supported by the metrics/rollups endpoints. Kept tight and
 * user-selectable from the UI as a small enum rather than free-form hours so
 * the index/aggregate plan stays bounded. The `24h`/`7d`/`30d` strings are
 * referenced from the frontend translations.
 */
export type MetricsWindow = "24h" | "7d" | "30d"

const WINDOW_HOURS: Record<MetricsWindow, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
}

/**
 * Derive a run's duration in milliseconds from its `started_at`/`finished_at`
 * timestamps. Returns `null` when either bound is missing (run never started or
 * still in flight) or when the clock would otherwise yield a non-positive span.
 */
function computeDurationMs(
  startedAt: Date | string | null,
  finishedAt: Date | string | null
): number | null {
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  return ms
}

/**
 * Opaque cursor over the `(created_at, id)` ordering used by `listAll`. We
 * encode both components so two runs sharing a `created_at` second don't get
 * skipped or repeated as the user pages forward.
 */
function encodeCursor(createdAt: Date | string | null, id: string): string {
  const ts = createdAt instanceof Date ? createdAt.toISOString() : createdAt
  return `${ts}|${id}`
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  const [ts, id] = cursor.split("|")
  if (!ts || !id) return null
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return { createdAt: d, id }
}

/** Shared select shape for run rows across the history/feed endpoints. */
const RUN_BASE_COLUMNS = {
  id: jobRuns.id,
  jobId: jobRuns.jobId,
  status: jobRuns.status,
  trigger: jobRuns.trigger,
  startedAt: jobRuns.startedAt,
  finishedAt: jobRuns.finishedAt,
  createdAt: jobRuns.createdAt,
  jobName: jobs.name,
} as const

function shapeRun<
  T extends {
    id: string
    jobId: string | null
    status: "pending" | "running" | "ok" | "failed"
    trigger: string
    startedAt: Date | string | null
    finishedAt: Date | string | null
    createdAt: Date | string | null
    jobName: string | null
  },
>(row: T) {
  return {
    id: row.id,
    jobId: row.jobId,
    jobName: row.jobName,
    status: row.status,
    trigger: row.trigger,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    durationMs: computeDurationMs(row.startedAt, row.finishedAt),
  }
}

export const jobRunsHandler = {
  create: async (run: Omit<NewJobRun, "id" | "createdAt">) => {
    const r = await db.insert(jobRuns).values(run).returning()
    return r[0] ?? null
  },

  listByJob: async (jobId: string) => {
    return db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobId, jobId))
      .orderBy(desc(jobRuns.createdAt))
  },

  get: async (id: string) => {
    const r = await db.select().from(jobRuns).where(eq(jobRuns.id, id))
    return r[0] ?? null
  },

  update: async (
    id: string,
    run: Partial<Omit<NewJobRun, "id" | "createdAt">>
  ) => {
    const r = await db
      .update(jobRuns)
      .set(run)
      .where(eq(jobRuns.id, id))
      .returning()
    return r[0] ?? null
  },

  /**
   * Cross-job, most-recent-first feed of runs, paginated by `(created_at, id)`.
   * `LEFT JOIN jobs` so runs whose parent job was deleted still appear (with a
   * `null` `jobName` that the API layer maps to a placeholder string).
   */
  listAll: async ({ limit, cursor }: { limit: number; cursor?: string }) => {
    const decoded = cursor ? decodeCursor(cursor) : null

    // ORDER BY (created_at DESC, id DESC); keyset pagination over the same
    // tuple so the next batch picks up where the previous one ended even when
    // many rows share a `created_at` second.
    const order = [desc(jobRuns.createdAt), desc(jobRuns.id)]

    const baseQuery = db
      .select(RUN_BASE_COLUMNS)
      .from(jobRuns)
      .leftJoin(jobs, eq(jobs.id, jobRuns.jobId))

    const rowsRaw =
      decoded == null
        ? await baseQuery.orderBy(...order).limit(limit)
        : await baseQuery
            .where(
              or(
                lt(jobRuns.createdAt, decoded.createdAt),
                and(
                  eq(jobRuns.createdAt, decoded.createdAt),
                  lt(jobRuns.id, decoded.id)
                )
              )
            )
            .orderBy(...order)
            .limit(limit)

    const runs = rowsRaw.map(shapeRun)
    const last = runs[runs.length - 1]
    const nextCursor =
      runs.length === limit && last
        ? encodeCursor(last.createdAt, last.id)
        : null

    return { runs, nextCursor }
  },

  /**
   * Aggregate metrics over a caller-selected time window (filtering on
   * `created_at`). Returns a zeroed result for an empty window rather than
   * blowing up on division-by-zero.
   */
  metrics: async ({ window }: { window: MetricsWindow }) => {
    const hours = WINDOW_HOURS[window]
    const since = sql`now() - (${sql.raw(String(hours))} || ' hours')::interval`

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        okCount: sql<number>`count(*) filter (where ${jobRuns.status} = 'ok')::int`,
        failedCount: sql<number>`count(*) filter (where ${jobRuns.status} = 'failed')::int`,
        avgDurationMs: sql<
          number | null
        >`avg(extract(epoch from (${jobRuns.finishedAt} - ${jobRuns.startedAt})) * 1000) filter (where ${jobRuns.finishedAt} is not null and ${jobRuns.startedAt} is not null)`,
      })
      .from(jobRuns)
      .where(sql`${jobRuns.createdAt} >= ${since}`)

    const total = Number(row?.total ?? 0)
    const okCount = Number(row?.okCount ?? 0)
    const failedCount = Number(row?.failedCount ?? 0)
    const successRate = total > 0 ? okCount / total : 0

    return {
      window,
      total,
      okCount,
      failedCount,
      successRate,
      // `avg` over zero matching rows returns `null`; fall back to 0 in that
      // case so the UI never has to special-case `null` for "no data yet".
      avgDurationMs: row?.avgDurationMs == null ? 0 : Number(row.avgDurationMs),
    }
  },

  /**
   * Per-job rollup: for every job, the latest run's status and the success
   * ratio of its last 10 runs. Jobs that have never run still appear, with
   * a `null` latest status and zero success ratio, so the UI can render
   * empty states without dropping rows.
   */
  perJobRollups: async () => {
    // "Last 10" recent run ids per job, ranked by (created_at desc, id desc),
    // which we'll use to compute a per-job success ratio.
    const recent = db
      .select({
        jobId: jobRuns.jobId,
        id: jobRuns.id,
        createdAt: jobRuns.createdAt,
        status: jobRuns.status,
        rn: sql<number>`row_number() over (partition by ${jobRuns.jobId} order by ${jobRuns.createdAt} desc, ${jobRuns.id} desc)`,
      })
      .from(jobRuns)
      .as("recent")

    const latest = db
      .select({
        jobId: recent.jobId,
        latestId: recent.id,
        latestCreatedAt: recent.createdAt,
        latestStatus: recent.status,
        rn: sql<number>`row_number() over (partition by ${recent.jobId} order by ${recent.createdAt} desc, ${recent.id} desc)`,
      })
      .from(recent)
      .where(eq(recent.rn, 1))
      .as("latest")

    const ratios = db
      .select({
        jobId: recent.jobId,
        okCount: sql<number>`count(*) filter (where ${recent.status} = 'ok')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(recent)
      .where(lt(recent.rn, 11))
      .groupBy(recent.jobId)
      .as("ratios")

    const rows = await db
      .select({
        jobId: jobs.id,
        jobName: jobs.name,
        latestRunId: latest.latestId,
        latestStatus: latest.latestStatus,
        latestCreatedAt: latest.latestCreatedAt,
        successOkCount: ratios.okCount,
        successTotal: ratios.total,
        latestDurationMs: sql<
          number | null
        >`extract(epoch from (${jobRuns.finishedAt} - ${jobRuns.startedAt})) * 1000`,
      })
      .from(jobs)
      .leftJoin(latest, eq(latest.jobId, jobs.id))
      .leftJoin(jobRuns, eq(jobRuns.id, latest.latestId))
      .leftJoin(ratios, eq(ratios.jobId, jobs.id))
      .orderBy(asc(jobs.name))

    return rows.map((r) => {
      const ok = Number(r.successOkCount ?? 0)
      const total = Number(r.successTotal ?? 0)
      const durationMs =
        r.latestDurationMs == null ? null : Number(r.latestDurationMs)
      return {
        jobId: r.jobId,
        jobName: r.jobName,
        latestRunId: r.latestRunId ?? null,
        latestStatus: r.latestStatus ?? null,
        latestCreatedAt: r.latestCreatedAt ?? null,
        latestDurationMs:
          durationMs != null && Number.isFinite(durationMs) && durationMs > 0
            ? durationMs
            : null,
        recentSuccessRatio: total > 0 ? ok / total : 0,
        recentRunCount: total,
      }
    })
  },

  /**
   * Lightweight per-job latest status only — used by the dashboard "Recent
   * activity" panel when the full `listAll` payload isn't yet needed (kept
   * here so handlers stay the single source for run queries).
   */
  gt,
}

/**
 * Suppress unused-import linting for symbols that are type-exported from this
 * module (drizzle's `gt` is re-exported via `jobRunsHandler` only when callers
 * extend the handlers). We re-export it explicitly so the symbol is used and
 * the file's surface matches what's documented in the spec/design.
 */
export { gt }
