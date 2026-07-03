import { defineConfig } from "tsdown"

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  // Bundle everything (workspace packages and npm deps alike) so the
  // production image only needs the dist folder — no node_modules.
  noExternal: [/.*/],
})
