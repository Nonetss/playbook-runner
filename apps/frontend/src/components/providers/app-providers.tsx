import { QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useEffect, useState } from "react"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ConfirmProvider } from "@/hooks/useConfirm"
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n/config"
import { getQueryClient } from "@/lib/query-client"

function readLocaleFromBrowser(): string {
  if (typeof document === "undefined") return DEFAULT_LOCALE
  try {
    const fromCookie = document.cookie
      .split(/;\s*/)
      .map((p) => p.split("="))
      .find(([k]) => k === LOCALE_COOKIE)?.[1]
    const cookieValue = fromCookie ? decodeURIComponent(fromCookie) : null
    if (isSupportedLocale(cookieValue)) return cookieValue
    const fromStorage = window.localStorage?.getItem(LOCALE_COOKIE)
    if (isSupportedLocale(fromStorage)) return fromStorage
    const navLang = window.navigator?.language?.slice(0, 2)
    if (isSupportedLocale(navLang)) return navLang
  } catch {
    /* no-op */
  }
  return DEFAULT_LOCALE
}

/**
 * Per-island providers.
 *
 * Astro renders every `client:*` component as an independent React root, so a
 * single provider in `Layout.astro` cannot supply context to sibling islands.
 * Instead each island that uses react-query / confirm wraps itself with
 * `AppProviders`. They all share the same QueryClient because `getQueryClient`
 * returns a browser singleton, so the cache is shared across islands and Astro
 * page swaps. List/detail hooks use `useHydratedQuery` so SSR markup matches
 * the first client paint even when that cache is already warm.
 *
 * Each island gets its own `I18nProvider` (with the locale SSR resolved).
 * Because `initI18n` is a singleton over `i18next.createInstance`, all islands
 * end up sharing the same i18next instance anyway, so no extra reload cost.
 *
 * The `<Toaster />` is NOT mounted here on purpose: sonner toasts are a global
 * store, so a single `<Toaster />` island is mounted once in `Layout.astro`.
 */
export function AppProviders({
  initialLocale,
  children,
}: {
  initialLocale?: string
  children: ReactNode
}) {
  const queryClient = getQueryClient()
  const [resolvedLocale, setResolvedLocale] = useState(
    initialLocale ?? DEFAULT_LOCALE
  )

  useEffect(() => {
    if (initialLocale) return
    const fromBrowser = readLocaleFromBrowser()
    if (fromBrowser !== resolvedLocale) {
      setResolvedLocale(fromBrowser)
    }
  }, [initialLocale, resolvedLocale])

  return (
    <I18nProvider initialLocale={resolvedLocale}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}
