import { env } from "@none.stack/env/server"
import { drizzle } from "drizzle-orm/node-postgres"

import { relations } from "@/relations"

export function createDb() {
  return drizzle(env.DATABASE_URL, { relations })
}

export const db = createDb()
