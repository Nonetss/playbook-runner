import { defineConfig } from "tsdown"

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    // User-run data migration, shipped so it works inside the image too.
    "encrypt-credentials": "./src/scripts/encrypt-credentials.ts",
  },
  format: "esm",
  outDir: "./dist",
  clean: true,
  // Runtime image ships no node_modules, so every dependency must be
  // inlined — not just @playbook-runner/* workspace packages. Otherwise
  // deep subpaths like "better-auth/adapters/drizzle" are left as bare
  // external imports and Bun tries to auto-install them from the
  // registry at container start (wrong versions, no network in prod).
  deps: {
    alwaysBundle: () => true,
  },
})
