import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")

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
  /** Extra header actions rendered next to the create CTA. */
  extraActions?: React.ReactNode
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
  extraActions,
  className,
  children,
}: ResourcePageProps) {
  const createButton = hideCreate ? null : createHref ? (
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

  return (
    <PageShell className={className}>
      <PageHero
        title={title}
        description={description}
        className="mb-6"
        action={
          extraActions || createButton ? (
            <>
              {extraActions}
              {createButton}
            </>
          ) : undefined
        }
      />
      {children}
    </PageShell>
  )
}
