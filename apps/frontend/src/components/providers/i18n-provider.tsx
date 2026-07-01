"use client"

import i18next from "i18next"
import { type ReactNode, useEffect, useState } from "react"
import { I18nextProvider } from "react-i18next"
import { initI18n } from "@/lib/i18n"
import { isSupportedLocale } from "@/lib/i18n/config"

/**
 * Initializes i18next on the client with the SSR-resolved locale and exposes
 * `I18nextProvider` so descendant `useTranslation` hooks see the same
 * singleton instance.
 *
 * The provider initial locale is the one Astro middleware computed. If no
 * SSR locale is available (e.g. `client:only` islands), the browser cookie /
 * localStorage / navigator is consulted. Initialization starts eagerly at
 * module import, so by the time this effect runs the singleton is typically
 * already initialized — we still wait for the explicit promise so the first
 * render always has a ready instance.
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string
  children: ReactNode
}) {
  const [ready, setReady] = useState(i18next.isInitialized)

  useEffect(() => {
    let cancelled = false
    const localeArg = isSupportedLocale(initialLocale ?? null)
      ? (initialLocale as string)
      : undefined
    void initI18n(localeArg).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [initialLocale])

  if (!ready) {
    return <>{children}</>
  }

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>
}
