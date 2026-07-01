import { LOCALE_COOKIE } from "@/lib/i18n/config"

const LOCALE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function setLocaleCookie(value: string): void {
  if (typeof document === "undefined") return

  if ("cookieStore" in window) {
    void window.cookieStore.set({
      name: LOCALE_COOKIE,
      value,
      path: "/",
      expires: Date.now() + LOCALE_MAX_AGE_SECONDS * 1000,
      sameSite: "lax",
    })
    return
  }

  // biome-ignore lint/suspicious/noDocumentCookie: fallback when Cookie Store API is unavailable
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${LOCALE_MAX_AGE_SECONDS}; samesite=lax`
}
