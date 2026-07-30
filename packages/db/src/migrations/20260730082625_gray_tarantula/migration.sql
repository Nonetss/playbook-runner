ALTER TABLE "job_runs" ADD COLUMN "hosts_ok" integer;--> statement-breakpoint
ALTER TABLE "job_runs" ADD COLUMN "hosts_failed" integer;--> statement-breakpoint
-- Backfill the two new columns for runs already in the history, reading the
-- per-host recap out of the captured `playbook_on_stats` event. Mirrors
-- `countHostOutcomes` in packages/api/src/jobs/executor.ts: a host counts as
-- failed when it has any `failures` or `dark` (unreachable) entries. Runs with
-- no recap keep NULL counts, i.e. "unknown".
UPDATE "job_runs" AS r
SET "hosts_ok" = c."ok_count", "hosts_failed" = c."failed_count"
FROM (
  SELECT
    h."run_id",
    count(*) FILTER (WHERE h."failed" = 0)::int AS "ok_count",
    count(*) FILTER (WHERE h."failed" > 0)::int AS "failed_count"
  FROM (
    SELECT
      run."id" AS "run_id",
      COALESCE((recap."stats" -> 'failures' ->> host."name")::int, 0)
        + COALESCE((recap."stats" -> 'dark' ->> host."name")::int, 0) AS "failed"
    FROM "job_runs" run
    CROSS JOIN LATERAL (
      SELECT ev."value" -> 'stats' AS "stats"
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(run."events_json") = 'array' THEN run."events_json"
          ELSE '[]'::jsonb
        END
      ) WITH ORDINALITY AS ev("value", "ord")
      WHERE ev."value" ->> 'event' = 'playbook_on_stats'
        AND jsonb_typeof(ev."value" -> 'stats') = 'object'
      ORDER BY ev."ord" DESC
      LIMIT 1
    ) AS recap
    CROSS JOIN LATERAL jsonb_object_keys(
      COALESCE(recap."stats" -> 'ok', '{}'::jsonb)
        || COALESCE(recap."stats" -> 'changed', '{}'::jsonb)
        || COALESCE(recap."stats" -> 'failures', '{}'::jsonb)
        || COALESCE(recap."stats" -> 'dark', '{}'::jsonb)
        || COALESCE(recap."stats" -> 'skipped', '{}'::jsonb)
    ) AS host("name")
  ) AS h
  GROUP BY h."run_id"
) AS c
WHERE r."id" = c."run_id";