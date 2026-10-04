// @ts-check
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

// Static project site published to GitHub Pages under
// https://nonetss.github.io/playbook-runner/. Every internal link goes through
// `href()` (src/lib/url.ts) so the base path is applied once.
export default defineConfig({
  site: "https://nonetss.github.io",
  base: "/playbook-runner",
  trailingSlash: "always",
  output: "static",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    shikiConfig: { theme: "github-dark-default", wrap: false },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
})
