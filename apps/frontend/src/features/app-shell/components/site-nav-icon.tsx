import { getSiteNavItemByHref } from "@/features/app-shell/site-nav"

/** Renders the `siteNavItems` icon declared for `href`. */
export function SiteNavIcon({
  href,
  className = "size-5",
}: {
  href: string
  className?: string
}) {
  const item = getSiteNavItemByHref(href)
  if (!item) return null

  const Icon = item.icon
  return <Icon className={className} />
}
