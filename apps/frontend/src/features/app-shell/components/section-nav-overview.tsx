import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { AppLink } from "@/components/ui/app-link"
import { SiteNavIcon } from "@/features/app-shell/components/site-nav-icon"
import type { SiteNavSubItem } from "@/features/app-shell/site-nav"
import { getSiteNavItemByHref } from "@/features/app-shell/site-nav"
import { cn } from "@/lib/utils"

function SectionNavCard({
  item,
  label,
  description,
  enterLabel,
}: {
  item: SiteNavSubItem
  label: string
  description: string
  enterLabel: string
}) {
  const Icon = item.icon

  return (
    <AppLink
      href={item.href}
      className={cn(
        "group dash-enter relative flex flex-col overflow-hidden rounded-xl border bg-card/40 p-5",
        "transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <Icon className="size-5 text-primary" />

      <div className="mt-4 min-h-0 flex-1">
        <h2 className="truncate text-base font-medium tracking-tight">
          {label}
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
        {enterLabel}
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </AppLink>
  )
}

function SectionNavOverviewInner({ section }: { section: string }) {
  const { t } = useTranslation("nav")
  const item = getSiteNavItemByHref(section)
  if (!item?.subItems) return null

  return (
    <PageShell maxWidth="6xl">
      <PageHero
        icon={<SiteNavIcon href={item.href} />}
        title={t(item.labelKey)}
        description={t(item.descriptionKey)}
        className="mb-8"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {item.subItems.map((subItem) => (
          <SectionNavCard
            key={subItem.href}
            item={subItem}
            label={t(subItem.labelKey)}
            description={t(subItem.descriptionKey)}
            enterLabel={t("actions.open")}
          />
        ))}
      </div>
    </PageShell>
  )
}

/** Parent route overview for a navigation section with declared sub-items. */
export function SectionNavOverview({ section }: { section: string }) {
  return (
    <AppProviders>
      <SectionNavOverviewInner section={section} />
    </AppProviders>
  )
}
