## Why

An audit of `apps/frontend` found a group of small client-side bugs. Each is minor, but together they make the app feel unreliable and, in one case, leak data across users:

- The shared React Query cache survives sign-out. A second user on the same tab can see the previous user's devices, credentials and jobs for up to the 60 s freshness window.
- Edit forms show stale data after saving.
- Failed deletes show two error toasts.
- Several async handlers leave rejections unhandled.
- A few rough edges remain in the route guard, i18n and accessibility.

These should be fixed before more features are built on the same data layer.

## What Changes

- **Session-scoped cache.** Clear the shared `QueryClient` on sign-out and on successful sign-in, so no cached data outlives the session that fetched it.
- **Detail invalidation.** Every update mutation (scripts, playbooks, groups, devices, credentials, playbook folders, jobs) invalidates the single-item `get` query for the edited id. Every delete removes it. This happens centrally in `useResourceMutation` rather than through the ad-hoc wrapper in `useJobUpdate`.
- **One toast per failure.** Remove the page-level `notifyError` calls that duplicate the toast `useResourceMutation` already shows (scripts, inventory ×2, playbooks, jobs ×2, credentials pages).
- **Surface every mutation error.** Handle rejections in:
  - `group-detail-page.tsx`: delete, assign, unassign. The assign/unassign hooks currently fail silently.
  - `job-detail-page.tsx`: run now.
  - `config-page.tsx`: API key delete.
- **Run-stream lifecycle.**
  - `PingDeviceModal` detaches its stream when the modal closes.
  - The run-stream hooks (`use-run-command`, `use-run-playbook`, `use-run-script`, `use-ping-device`) pass a stable, module-level `subscribe`, so `start` keeps the same identity across renders.
- **Route guard correctness.**
  - Public paths match exactly or as a path prefix followed by `/`. `/login-foo` is no longer public.
  - Authenticated users who visit `/login` are redirected to `/`.
  - Removing `/signup` from the public list is owned by the `harden-access-control` change and is not part of this change.
- **i18n.** Replace the hardcoded Spanish fallback labels (`"este grupo"`, `"este dispositivo"`, `"esta credencial"`) with translation keys in both `en` and `es`.
- **Accessibility.** `PlaybookFolderCard` stops using `role="link"` on a container that holds buttons. It uses a real anchor (stretched-link pattern) instead, and keeps drag-and-drop on the card.

Out of scope: removing dead components and hooks, which is owned by `cleanup-conventions-docs`, and backend changes.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `app-data-layer`: adds two requirements. The cache is scoped to the authenticated session, and mutations keep detail queries in sync.
- `interaction-feedback`: the action-result notification requirement now requires exactly one error toast per failed mutation, including relation assign/unassign.
- `web-navigation`: sign-out clears client cache. Adds a frontend route guard requirement: exact or prefix public-path matching, and redirecting authenticated users away from `/login`.
- `frontend-i18n`: fallback labels interpolated into translated strings must also be translated.

## Impact

- **Code:**
  - `apps/frontend/src/hooks/use-resource-mutation.ts`
  - `features/*/hooks/use-*.ts` (update and delete hooks)
  - `features/*/components/*-page.tsx` (delete handlers)
  - `features/inventory/components/group-detail-page.tsx`
  - `features/inventory/components/ping-device-modal.tsx`
  - `features/jobs/components/job-detail-page.tsx`
  - `features/config/components/config-page.tsx`
  - `features/run/hooks/*`
  - `features/app-shell/components/user-nav.tsx`
  - `features/auth/components/sign-in-form.tsx`
  - `features/playbooks/components/playbook-folder-card.tsx`
  - `src/middleware.ts`
  - `src/lib/i18n` locale files for `inventory` and `credentials`
- **APIs:** none. No backend, schema or migration changes.
- **Dependencies:** none.
- **Coordination:**
  - `harden-access-control` edits the same `publicPaths` list in `middleware.ts`. Apply one after the other.
  - `cleanup-conventions-docs` deletes unused hooks in the same hook files.
