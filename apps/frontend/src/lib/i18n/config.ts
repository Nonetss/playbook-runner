export const SUPPORTED_LOCALES = ["es", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "es"

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  en: "English",
}

export const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "account",
  "playbooks",
  "jobs",
  "scripts",
  "inventory",
  "credentials",
  "commands",
  "config",
  "dashboard",
] as const

export type Namespace = (typeof NAMESPACES)[number]

export function isSupportedLocale(
  value: string | undefined | null
): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export const LOCALE_COOKIE = "locale"
