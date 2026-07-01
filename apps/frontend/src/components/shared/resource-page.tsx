import { Plus } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ResourcePageProps {
  title: string
  description?: string
  createLabel: string
  onCreate: () => void
  /** Hide the create CTA (e.g. when the feature has a custom layout). */
  hideCreate?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Shared header + create button used by every resource page (devices, groups,
 * credentials, playbooks). Keeps the visual identity consistent and removes
 * duplicated copy.
 */
export function ResourcePage({
  title,
  description,
  createLabel,
  onCreate,
  hideCreate = false,
  className,
  children,
}: ResourcePageProps) {
  return (
    <main
      className={cn(
        "w-full min-w-0 flex-1 overflow-x-hidden p-6 lg:px-8",
        className
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          ) : null}
        </div>

        {!hideCreate && (
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            {createLabel}
          </Button>
        )}
      </div>

      {children}
    </main>
  )
}
