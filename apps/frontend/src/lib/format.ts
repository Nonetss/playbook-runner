/** Locale-aware date formatting for the active UI language (`es` | `en`). */
function toIntlLocale(language: string) {
  return language.startsWith("en") ? "en-US" : "es-ES"
}

export function formatDate(
  value: Date | string | null | undefined,
  language: string
): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(toIntlLocale(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(
  value: Date | string | null | undefined,
  language: string
): string {
  if (!value) return "—"
  return new Date(value).toLocaleString(toIntlLocale(language), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
