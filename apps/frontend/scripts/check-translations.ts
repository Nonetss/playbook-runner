#!/usr/bin/env bun
/**
 * Flags every English key that is not present in every other locale.
 * Exits with a non-zero status if gaps exist, so CI can gate new translations.
 *
 * Usage: `bun scripts/check-translations.ts`
 */

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = join(HERE, "..", "src", "locales")
const REFERENCE_LOCALE = "en"

type Tree = string | { [k: string]: Tree }

function readJson(path: string): Tree {
  return JSON.parse(readFileSync(path, "utf8"))
}

function keys(tree: Tree, prefix = ""): string[] {
  if (typeof tree === "string") return prefix ? [prefix] : []
  const out: string[] = []
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === "string") {
      out.push(path)
    } else {
      out.push(...keys(v, path))
    }
  }
  return out
}

const refDir = join(LOCALES_DIR, REFERENCE_LOCALE)
const refFiles = new Set(readdirSync(refDir).filter((f) => f.endsWith(".json")))

let exitCode = 0

for (const file of refFiles) {
  const referenceKeys = new Set(keys(readJson(join(refDir, file)) as Tree))
  for (const locale of readdirSync(LOCALES_DIR)) {
    if (locale === REFERENCE_LOCALE) continue
    if (!locale.startsWith(".")) {
      const candidate = join(LOCALES_DIR, locale, file)
      try {
        const candidateKeys = new Set(keys(readJson(candidate) as Tree))
        const missing = [...referenceKeys].filter((k) => !candidateKeys.has(k))
        if (missing.length) {
          console.error(
            `✖ ${locale}/${file}: missing ${missing.length} key(s) vs ${REFERENCE_LOCALE}:`
          )
          for (const k of missing) console.error(`    - ${k}`)
          exitCode = 1
        } else {
          console.log(`✓ ${locale}/${file}`)
        }
      } catch {
        console.error(`✖ ${locale}/${file}: failed to parse`)
        exitCode = 1
      }
    }
  }
}

if (exitCode === 0) {
  console.log("\nAll locales match the reference locale keys.")
}

process.exit(exitCode)
