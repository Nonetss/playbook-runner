import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config"

/**
 * Resolve the active locale from a `Cookie` header and an `Accept-Language`
 * header. Precedence: cookie → Accept-Language → DEFAULT_LOCALE.
 */
export function resolveLocaleFromHeaders(
  cookieHeader: string | null,
  acceptLanguage: string | null
): string {
  const fromCookie = readCookie(cookieHeader, LOCALE_COOKIE)
  if (isSupportedLocale(fromCookie)) return fromCookie

  const fromHeader = matchAcceptLanguage(acceptLanguage)
  if (fromHeader) return fromHeader

  return DEFAULT_LOCALE
}

function readCookie(
  cookieHeader: string | null,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(/;\s*/)) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    const k = part.slice(0, eq).trim()
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

function matchAcceptLanguage(header: string | null): string | null {
  if (!header) return null
  const tags = header
    .split(",")
    .map((entry) => {
      const [tag, ...params] = entry.trim().split(";")
      const qParam = params.find((p) => p.trim().startsWith("q="))
      const q = qParam ? Number(qParam.slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 }
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of tags) {
    const primary = tag.split("-")[0]
    if (isSupportedLocale(primary)) return primary
    // Pick the first registered locale that matches broadly
    const match = SUPPORTED_LOCALES.find((loc) => tag.startsWith(loc))
    if (match) return match
  }
  return null
}
