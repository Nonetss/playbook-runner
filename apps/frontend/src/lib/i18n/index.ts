import i18next, { type i18n as I18nInstance, type InitOptions } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE,
  NAMESPACES,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config"
import enAccount from "@/locales/en/account.json"
import enAuth from "@/locales/en/auth.json"
import enCommands from "@/locales/en/commands.json"
import enCommon from "@/locales/en/common.json"
import enConfig from "@/locales/en/config.json"
import enCredentials from "@/locales/en/credentials.json"
import enDashboard from "@/locales/en/dashboard.json"
import enInventory from "@/locales/en/inventory.json"
import enJobs from "@/locales/en/jobs.json"
import enNav from "@/locales/en/nav.json"
import enPlaybooks from "@/locales/en/playbooks.json"
import enScripts from "@/locales/en/scripts.json"
import esAccount from "@/locales/es/account.json"
import esAuth from "@/locales/es/auth.json"
import esCommands from "@/locales/es/commands.json"
import esCommon from "@/locales/es/common.json"
import esConfig from "@/locales/es/config.json"
import esCredentials from "@/locales/es/credentials.json"
import esDashboard from "@/locales/es/dashboard.json"
import esInventory from "@/locales/es/inventory.json"
import esJobs from "@/locales/es/jobs.json"
import esNav from "@/locales/es/nav.json"
import esPlaybooks from "@/locales/es/playbooks.json"
import esScripts from "@/locales/es/scripts.json"

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    account: enAccount,
    playbooks: enPlaybooks,
    jobs: enJobs,
    scripts: enScripts,
    inventory: enInventory,
    credentials: enCredentials,
    commands: enCommands,
    config: enConfig,
    dashboard: enDashboard,
  },
  es: {
    common: esCommon,
    nav: esNav,
    auth: esAuth,
    account: esAccount,
    playbooks: esPlaybooks,
    jobs: esJobs,
    scripts: esScripts,
    inventory: esInventory,
    credentials: esCredentials,
    commands: esCommands,
    config: esConfig,
    dashboard: esDashboard,
  },
}

let initPromise: Promise<I18nInstance> | null = null
let moduleInitStarted = false

function detectInitialLocaleFromBrowser(): string {
  if (typeof document === "undefined") return DEFAULT_LOCALE
  try {
    const cookieMatch = document.cookie
      .split(/;\s*/)
      .map((p) => p.split("="))
      .find(([k]) => k === LOCALE_COOKIE)
    if (cookieMatch) {
      const v = decodeURIComponent(cookieMatch[1] ?? "")
      if (isSupportedLocale(v)) return v
    }
    const fromStorage = window.localStorage?.getItem(LOCALE_COOKIE)
    if (isSupportedLocale(fromStorage ?? null)) return fromStorage!
    const nav = window.navigator?.language?.slice(0, 2)
    if (isSupportedLocale(nav)) return nav
  } catch {
    /* no-op */
  }
  return DEFAULT_LOCALE
}

/**
 * Returns a promise that resolves once i18next is initialized. The
 * initialization starts eagerly at module import so subsequent calls don't
 * see "useTranslation before ready" errors — every consumer waits on the same
 * promise.
 */
export function initI18n(initialLocale?: string): Promise<I18nInstance> {
  const desired = isSupportedLocale(initialLocale ?? null)
    ? (initialLocale as string)
    : undefined

  if (initPromise) {
    // Already initializing/initialized (e.g. eager module start). Honor an
    // explicit SSR-resolved locale by switching to it once ready, so the
    // `initialLocale` argument is never silently dropped.
    if (desired) {
      initPromise = initPromise.then(async (inst) => {
        if (inst.language !== desired) await inst.changeLanguage(desired)
        return inst
      })
    }
    return initPromise
  }

  const locale = desired ?? detectInitialLocaleFromBrowser()

  const options: InitOptions = {
    resources,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    fallbackLng: "en",
    lng: locale,
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  }

  i18next.use(LanguageDetector).use(initReactI18next)

  const p = i18next.init(options) as unknown as Promise<unknown>
  initPromise = (p as Promise<I18nInstance>).then(
    () => i18next as unknown as I18nInstance
  )
  moduleInitStarted = true
  return initPromise
}

function ensureStarted() {
  if (!moduleInitStarted) {
    void initI18n()
  }
}

ensureStarted()

export function setI18nLocale(code: string) {
  void i18next.changeLanguage(code)
}

export function getI18n(): I18nInstance {
  return i18next as unknown as I18nInstance
}
