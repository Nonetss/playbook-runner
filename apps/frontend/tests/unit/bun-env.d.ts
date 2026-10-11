// `astro check` type-checks `tests/`, and the Astro tsconfig doesn't load
// every installed `@types/*`: reference Bun's so `bun:test` resolves.
/// <reference types="bun" />

// The handle `@happy-dom/global-registrator` puts on `window` (the preload
// registers it), reduced to what the tests call.
interface Window {
  happyDOM?: {
    setViewport(viewport: { width?: number; height?: number }): void
  }
}
