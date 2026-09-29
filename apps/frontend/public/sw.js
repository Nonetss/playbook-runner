// Minimal PWA service worker: makes the app installable and keeps a
// last-known-good copy of the shell for offline use. Network-first for
// everything — this app changes often and staleness is worse than a cache
// miss — falling back to cache only when the network actually fails. Never
// touches /rpc, /api, /scalar or /openapi.json — that's live
// run/auth data (including the execution streams) and must always be
// fetched fresh.
const CACHE = "playbook-runner-shell-v2"
const BYPASS = [/^\/rpc\//, /^\/api\//, /^\/scalar/, /^\/openapi\.json/]

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (BYPASS.some((pattern) => pattern.test(url.pathname))) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Redirects (e.g. to /login) and errors are never a good offline copy.
        if (response.ok && !response.redirected) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() =>
        caches
          .match(request)
          .then(
            (cached) =>
              cached ??
              (request.mode === "navigate"
                ? caches.match("/")
                : Response.error())
          )
      )
  )
})
