"use client"

import { Check, Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setLocaleCookie } from "@/lib/i18n/client-cookie"
import {
  isSupportedLocale,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  type Locale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config"

function persistLocale(code: Locale) {
  try {
    window.localStorage.setItem(LOCALE_COOKIE, code)
  } catch {
    /* no-op: private mode / quota */
  }
  setLocaleCookie(code)
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("common")
  const current = isSupportedLocale(i18n.language)
    ? (i18n.language as Locale)
    : "es"

  function handleChange(value: string) {
    if (!isSupportedLocale(value)) return
    const next = value as Locale
    void i18n.changeLanguage(next)
    persistLocale(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t("labels.change_language")}
        data-testid="language-switcher-trigger"
        className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-xs transition-colors outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
      >
        <Languages className="size-4 shrink-0" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-44 w-44">
        <DropdownMenuLabel>{t("labels.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={current} onValueChange={handleChange}>
          {SUPPORTED_LOCALES.map((code) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              data-testid={`language-option-${code}`}
              className="cursor-pointer"
            >
              {LOCALE_LABELS[code]}
              {current === code ? (
                <Check className="ml-auto size-4" aria-hidden />
              ) : null}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
