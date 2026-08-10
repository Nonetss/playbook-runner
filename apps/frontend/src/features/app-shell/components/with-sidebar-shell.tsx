import type { ReactNode } from "react"
import { AppProviders } from "@/components/providers/app-providers"
import { AppShell } from "@/features/app-shell/components/app-shell"
import { SectionSidebar } from "@/features/app-shell/components/section-sidebar"

interface WithSidebarShellProps {
  section: string
  currentPath: string
  defaultOpen?: boolean
  children: ReactNode
}

function WithSidebarShellInner({
  section,
  currentPath,
  defaultOpen = true,
  children,
}: WithSidebarShellProps) {
  return (
    <AppShell
      defaultOpen={defaultOpen}
      sidebar={<SectionSidebar section={section} currentPath={currentPath} />}
    >
      {children}
    </AppShell>
  )
}

/** Shared client shell for nested, metadata-defined application sections. */
export function WithSidebarShell(props: WithSidebarShellProps) {
  return (
    <AppProviders>
      <WithSidebarShellInner {...props} />
    </AppProviders>
  )
}
