import { db } from "@playbook-runner/db"
import { playbookRepositories } from "@playbook-runner/db/schema/playbook-repositories"
import { env } from "@playbook-runner/env/server"
import { logger } from "@playbook-runner/logger"
import { asc } from "drizzle-orm"
import { isValidCron } from "#v1/jobs/cron"
import { syncRepository } from "#v1/repositories/sync"

/** Value of `REPOSITORY_SYNC_CRON` that turns the periodic sync off. */
export const REPOSITORY_SYNC_OFF = "off"

/**
 * The cron pattern of the periodic repository sync, or null when it is off.
 * Throws on an invalid pattern, so a typo stops the backend at startup
 * instead of silently never syncing.
 */
export function repositorySyncPattern(value: string): string | null {
  const pattern = value.trim()
  if (pattern === REPOSITORY_SYNC_OFF) return null
  if (!isValidCron(pattern)) {
    throw new Error(
      `REPOSITORY_SYNC_CRON is not a valid cron expression: "${value}" (use "${REPOSITORY_SYNC_OFF}" to disable it)`
    )
  }
  return pattern
}

/**
 * Sync every Git repository, one after another so a round never takes more
 * than one of the runner's sync slots and never competes with runs for
 * them. A failed repository keeps its message in `lastSyncError` (stored by
 * `syncRepository`) and does not stop the others.
 */
export async function syncAllRepositories() {
  if (!env.SERVICE_TOKEN) {
    logger.warn("repository sync skipped: SERVICE_TOKEN is missing")
    return { synced: 0, failed: 0 }
  }

  const repositories = await db
    .select({ id: playbookRepositories.id, name: playbookRepositories.name })
    .from(playbookRepositories)
    .orderBy(asc(playbookRepositories.name))

  let synced = 0
  let failed = 0
  for (const repository of repositories) {
    try {
      await syncRepository(repository.id)
      synced++
    } catch (err) {
      failed++
      logger.warn(
        { repositoryId: repository.id, name: repository.name, err },
        "periodic repository sync failed"
      )
    }
  }
  return { synced, failed }
}
