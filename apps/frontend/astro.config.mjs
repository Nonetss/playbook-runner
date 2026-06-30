import { fileURLToPath } from "node:url"
import node from "@astrojs/node"
import react from "@astrojs/react"
// @ts-check
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, envField } from "astro/config"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  prefetch: {
    defaultStrategy: "hover",
  },
  env: {
    schema: {
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:4321",
      }),
    },
  },

  vite: {
    server: {
      proxy: {
        "/rpc": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        // Ansible microservice (playbook execution). It runs on its own port,
        // so it is exposed same-origin under the /ansible prefix, which is
        // stripped before proxying (e.g. /ansible/api/v1/run -> /api/v0/run).
        "/ansible": {
          target: "http://localhost:8001",
          changeOrigin: true,
        },
        "/scalar": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/openapi.json": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },

  integrations: [react()],
})
