import { AppProviders } from "@/components/providers/app-providers"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { SurfaceCardGrid } from "@/components/shared/navigation/surface-card"
import { appSections, type SectionId } from "@/lib/app-surfaces"

/** Landing page of a navigation section: registry hero + one tile per child. */
export function SectionNavOverview({ section }: { section: SectionId }) {
  return (
    <AppProviders>
      <PageShell>
        <PageHero surface={section} />
        <SurfaceCardGrid surfaces={appSections[section]} />
      </PageShell>
    </AppProviders>
  )
}
