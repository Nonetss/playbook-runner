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
  // Bundle everything (workspace packages and npm deps alike) so the
  // production image only needs the dist folder — no node_modules.
  noExternal: [/.*/],
})
