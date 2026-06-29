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
    defaultStrategy: "viewport",
  },
  env: {
    schema: {
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:3000",
      }),
    },
  },

  vite: {
    server: {
      proxy: {
        "/rpc": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/scalar": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/openapi.json": {
          target: "http://localhost:3000",
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
