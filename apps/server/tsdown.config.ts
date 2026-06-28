import fs from "node:fs"
import path from "node:path"
import { defineConfig } from "tsdown"

const workspaceRoot = path.resolve(import.meta.dirname, "../..")
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"]

// When noExternal bundles monorepo packages inline, rolldown uses the server's
// tsconfig for ALL @/ alias resolution. This plugin fixes that by resolving @/
// relative to each file's own package src/ directory.
function monorepoAliasPlugin() {
  const cache = new Map<string, string | null>()

  function findPackageSrc(filePath: string): string | null {
    if (cache.has(filePath)) return cache.get(filePath)!
    let dir = path.dirname(filePath)
    while (dir.startsWith(workspaceRoot) && dir !== workspaceRoot) {
      const srcDir = path.join(dir, "src")
      if (
        fs.existsSync(path.join(dir, "package.json")) &&
        fs.existsSync(srcDir) &&
        filePath.startsWith(srcDir)
      ) {
        cache.set(filePath, srcDir)
        return srcDir
      }
      dir = path.dirname(dir)
    }
    cache.set(filePath, null)
    return null
  }

  return {
    name: "monorepo-alias",
    resolveId(id: string, importer: string | undefined) {
      if (!id.startsWith("@/") || !importer) return null
      const srcDir = findPackageSrc(importer)
      if (!srcDir) return null
      const base = path.join(srcDir, id.slice(2))
      for (const ext of EXTENSIONS) {
        if (fs.existsSync(base + ext)) return base + ext
      }
      return null
    },
  }
}

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@none.stack\/.*/],
  plugins: [monorepoAliasPlugin()],
})
