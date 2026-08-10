import { Plus } from "lucide-react"
import type * as React from "react"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { Button } from "@/components/ui/button"

export interface ResourcePageProps {
  title: string
  description?: string
  createLabel: string
  onCreate?: () => void
  createHref?: string
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
  createHref,
  hideCreate = false,
  className,
  children,
}: ResourcePageProps) {
  return (
    <PageShell className={className}>
      <PageHero
        title={title}
        description={description}
        className="mb-6"
        action={
          !hideCreate ? (
            createHref ? (
              <Button asChild>
                <a href={createHref}>
                  <Plus className="size-4" />
                  {createLabel}
                </a>
              </Button>
            ) : (
              <Button onClick={onCreate}>
                <Plus className="size-4" />
                {createLabel}
              </Button>
            )
          ) : undefined
        }
      />
      {children}
    </PageShell>
  )
}
