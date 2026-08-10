## Context

The reusable sidebar layout and section overview already power Inventory.
Jobs has the same topology: scheduler configuration and a cross-job execution
history. The existing History route is top-level despite belonging to Jobs.

## Goals / Non-Goals

**Goals:**

- Put Scheduler and History under a consistent Jobs section.
- Make each surface directly addressable and discoverable in the sidebar.
- Preserve existing job CRUD, execution, history metrics, and detail routes.

**Non-Goals:**

- Change scheduler APIs, cron behaviour, history data, or job detail pages.
- Remove the legacy `/history` URL without a redirect.
- Add a new sidebar implementation; this change consumes the shared one.

## Decisions

### Canonical child routes with a section overview

`/jobs` becomes the overview, `/jobs/scheduler` renders the existing Jobs page,
and `/jobs/history` renders the existing History page. This exactly mirrors the
Inventory section topology while preserving the existing components.

### Redirect legacy History links

The old `/history` Astro route redirects server-side to `/jobs/history`.
Internal dashboard, history fallback, metric, and prefetch links move to the
canonical address so user navigation remains inside the Jobs section.

### Metadata defines navigation

Jobs sub-items are Scheduler and History in `siteNavItems`. The shared overview
and sidebar derive their links and labels from this metadata.

## Risks / Trade-offs

- [Saved `/history` links] → Preserve them through a redirect.
- [Existing job details link back to `/jobs`] → Keep that destination as the
  Jobs overview; it remains a valid section entry point.
- [History access from outside Jobs] → Canonical internal links return to the
  nested route so the sidebar supplies active context.

## Migration Plan

1. Add child routes and update Jobs navigation metadata.
2. Render the root as the shared section overview and redirect legacy History.
3. Update canonical internal history links.
4. Validate frontend types, translations, formatting, layout checks, and
   OpenSpec specs. Rollback restores the former route entries.
