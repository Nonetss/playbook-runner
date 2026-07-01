import { createInstance, type i18n as I18nInstance } from "i18next"
import {
  DEFAULT_LOCALE,
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

let serverInstance: I18nInstance | null = null
let serverInstancePromise: Promise<I18nInstance> | null = null

async function getServerInstance(): Promise<I18nInstance> {
  if (serverInstance && serverInstance.isInitialized) {
    return serverInstance
  }
  if (serverInstancePromise) return serverInstancePromise

  serverInstancePromise = (async () => {
    const inst = createInstance()
    await inst.init({
      resources,
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      fallbackLng: "en",
      lng: DEFAULT_LOCALE,
      ns: NAMESPACES as unknown as string[],
      defaultNS: "common",
      interpolation: { escapeValue: false },
      initImmediate: false,
    })
    serverInstance = inst
    serverInstancePromise = null
    return inst
  })()

  return serverInstancePromise
}

export async function getServerT(
  locale: string = DEFAULT_LOCALE,
  namespace?: string
) {
  const inst = await getServerInstance()
  const safeLocale = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? locale
    : DEFAULT_LOCALE
  if (inst.language !== safeLocale) {
    await inst.changeLanguage(safeLocale)
  }
  return inst.getFixedT(safeLocale, namespace ?? "common")
}
