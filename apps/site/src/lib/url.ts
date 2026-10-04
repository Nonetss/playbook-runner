import { defaultLang, type Lang, languages } from "@/i18n/ui"

export const REPO_URL = "https://github.com/Nonetss/playbook-runner"

const base = import.meta.env.BASE_URL.replace(/\/$/, "")

/** Prefixes a site path with the GitHub Pages base path. */
export function href(path = ""): string {
  const clean = path.replace(/^\/+/, "")
  return `${base}/${clean}`
}

/** A site path in the given language (English lives at the root). */
export function localized(lang: Lang, path = ""): string {
  const clean = path.replace(/^\/+/, "")
  return href(lang === defaultLang ? clean : `${lang}/${clean}`)
}

/** Reads the language from a pathname (with or without the base path). */
export function langFromPath(pathname: string): Lang {
  const [first] = pathname.slice(base.length).split("/").filter(Boolean)
  return first && first in languages && first !== defaultLang
    ? (first as Lang)
    : defaultLang
}

/** The same page in another language. */
export function switchLanguage(pathname: string, target: Lang): string {
  const rest = pathname.slice(base.length).split("/").filter(Boolean)
  if (rest[0] && rest[0] in languages) rest.shift()
  // The 404 page exists once; its language links go to the home page.
  if (rest[0]?.startsWith("404")) rest.length = 0
  const path = rest.length ? `${rest.join("/")}/` : ""
  return localized(target, path)
}
