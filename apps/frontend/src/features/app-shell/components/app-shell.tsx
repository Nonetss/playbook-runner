import type { ReactNode } from "react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface AppShellProps {
  sidebar?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** Navbar-aware shell: sidebar + inset. Use under the `WithSidebar` layout. */
export function AppShell({
  sidebar,
  defaultOpen = true,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="flex min-h-0 w-full flex-1 overflow-hidden"
    >
      {sidebar}
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-border/40 border-b px-3 sm:px-4">
          <SidebarTrigger />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
