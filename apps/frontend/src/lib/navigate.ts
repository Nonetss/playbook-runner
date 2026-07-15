import { navigate as astroNavigate } from "astro:transitions/client"

/** Client-side navigation that respects Astro View Transitions. */
export function navigate(href: string) {
  void astroNavigate(href)
}
