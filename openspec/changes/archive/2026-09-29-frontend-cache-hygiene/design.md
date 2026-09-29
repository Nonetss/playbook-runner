## Context

The frontend keeps one browser-wide `QueryClient` singleton (`src/lib/query-client.ts`). It survives Astro `ClientRouter` page swaps and has a 60 s `staleTime`. Two helpers run all CRUD mutations:

- `useResourceMutation` (`src/hooks/use-resource-mutation.ts`) does an optimistic list patch, rolls back and toasts on error, toasts on success, and invalidates the list plus `extraInvalidate` keys when the mutation settles.
- `useOrpcMutation` (`src/hooks/use-orpc-mutation.ts`) toasts on success and on error, then invalidates the given keys.

The audit found these problems:

- **Cache survives sign-out.** `user-nav.tsx` calls `authClient.signOut()` and then `navigate("/login")`. The sign-in form calls `navigate("/")`. Both are soft navigations, so the singleton cache survives them.
- **Detail queries go stale after updates.**
  - `useScriptUpdate`, `usePlaybookUpdate`, `useGroupUpdate`, `useDeviceUpdate` and `useCredentialUpdate` only invalidate the list.
  - `useJobUpdate` wraps `mutateAsync` to invalidate `orpc.jobs.get`. That covers `mutateAsync` callers only, not `mutate`.
  - Delete hooks leave the detail entry cached.
- **Double error toasts.** Page delete handlers `try { await x.mutateAsync() } catch { notifyError(...) }`, even though the helper has already toasted. The same happens for the job toggle in `jobs-page.tsx`.
- **Unhandled rejections, and silent failures:**
  - `group-detail-page.tsx` awaits `mutateAsync` for delete, assign and unassign without a catch. The assign/unassign hooks (`useDeviceGroupAssign`/`Unassign`) are raw `useMutation` with no error toast, so they fail silently.
  - `job-detail-page.tsx` "run now" and `config-page.tsx` API key delete also await `mutateAsync` without a catch.
- **Unstable run-stream `start`.**
  - Every run-stream hook builds `subscribe` inline. `useRunStream`'s `start` depends on it, so `start` gets a new identity on every render.
  - `PingDeviceModal`'s effect has no cleanup, and the modal stays mounted with `open=false`, so a ping keeps streaming after it is closed.
- **Look-alike paths treated as public.** `middleware.ts` uses `path.startsWith(p)`, so `/login-foo` or `/scalarx` count as public.
- **Hardcoded Spanish fallbacks.** Three are interpolated into confirm titles that are otherwise translated.
- **Invalid ARIA nesting.** `PlaybookFolderCard` is a `role="link"` container that holds buttons.

## Goals / Non-Goals

**Goals:**
- No cached data crosses a sign-out/sign-in boundary.
- Detail and edit views always reflect the last successful write.
- Every failed user action produces exactly one toast, and no `unhandledrejection`.
- `start` from the run-stream hooks is referentially stable.
- The route guard matches only intended public paths.

**Non-Goals:**
- Deleting unused components and hooks (`cleanup-conventions-docs`).
- Removing `/signup` or changing who may sign up (`harden-access-control`).
- Backend changes, server-side run cancellation (`fix-run-lifecycle`), or new tests infrastructure.

## Decisions

### D1. Clear the cache at the identity boundary, in the auth call sites
- **Sign-out.** In `user-nav.tsx`, call `getQueryClient().clear()` after `authClient.signOut()` resolves and before `navigate("/login")`. Clear even if `signOut` rejects (use `finally`), because the user expects to be logged out locally.
- **Email sign-in.** In `sign-in-form.tsx`'s email `onSuccess`, call `getQueryClient().clear()` before `navigate("/")`.
- **OAuth.** The OAuth flow does a full-page redirect, so the module singleton resets on its own. No change is needed.

*Alternative considered:* subscribing to `authClient.useSession()` changes in the provider and clearing on user-id change. It is more general, but it adds a render-time side effect and races with the first queries of the new session. The two explicit call sites are the only identity transitions in the app today.

### D2. Give `useResourceMutation` a `detailKey` option
Add `detailKey?: (input: TInput) => QueryKey`, and use it according to the kind of mutation:
- **Update:** in `onSettled`, `invalidateQueries({ queryKey: detailKey(input) })`.
- **Delete:** add a `removeDetail?: boolean` flag, or a separate `kind: "delete"` option. When set, call `removeQueries({ queryKey: detailKey(input) })` on success instead of invalidating. Invalidating would trigger a refetch that 404s.

Per-resource hooks pass `(input) => orpc.<x>.get.queryKey({ input: { id: input.id } })`. This covers scripts, playbooks, groups, devices, credentials and jobs. Playbook folders have no `get` query today, so they need no `detailKey`. The ad-hoc `mutateAsync` wrapper in `useJobUpdate` is deleted, because it is replaced by `detailKey`.

*Alternative considered:* passing `extraInvalidate` per call. It can't be done, because `extraInvalidate` is static and the key depends on the input id. The alternative is a wider prefix invalidation such as `orpc.scripts.key()`, which also refetches every list and detail. It is simpler, but it throws away cache for no reason.

### D3. The helper owns error toasts; pages only swallow
Remove the `notifyError` calls from these page delete and toggle handlers:
- `scripts-page`
- `inventory-page` (group and device)
- `playbooks-page`
- `jobs-page` (delete and toggle)
- `credentials-page`

Where a page must stop after a failure (for example, don't `navigate` after a failed delete), it keeps a bare `try { await m.mutateAsync(x) } catch { return }` with a short comment. Pages that don't need sequencing switch to `mutate(x)`, which never rejects.

For `group-detail-page.tsx`:
- **Delete:** wrap it so `navigate("/inventory")` only runs on success.
- **Assign/unassign:** make the hooks in `use-device-groups.ts` go through `useOrpcMutation`, with `error` messages taken from the existing `relations.create_error`/`relations.remove_error` keys, and keep their current invalidation. The page then calls `mutate`.

`relations-dialog.tsx` already shows its own success and error toasts around the same raw hooks. Once the hooks toast, the dialog must drop its own `notifyError`/`notifySuccess` calls, or it would show two toasts again.

`job-detail-page.tsx` "run now" and `config-page.tsx` API key delete: wrap them in try/catch with no toast, because `useOrpcMutation` and `useResourceMutation` already toast.

### D4. Stable `subscribe` for the run-stream hooks
Move each `subscribe` to module scope, next to its hook. It only closes over the imported `client` and `consumeEventIterator`, so it needs nothing from the render. `useRunStream`'s `start` then stays stable apart from `t`.

`PingDeviceModal` effect:
```
useEffect(() => {
  if (!open || !device) return
  reset(); start(device.id)
  return () => stopWatching()
}, [open, device?.id, start, reset, stopWatching])
```
This detaches the stream when the modal closes or the device changes. It only detaches the browser, which matches `useRunStream`'s documented semantics. Server-side cancellation belongs to `fix-run-lifecycle`.

### D5. Route guard matching
```
const isPublic = (path: string) =>
  publicPaths.some((p) => path === p || path.startsWith(`${p}/`))
```
When `/login` is requested and the session lookup succeeds, redirect to `/`. This needs a session lookup on `/login`, so the order becomes:
1. Compute `isPublic`.
2. If the path is `/login`, look up the session and redirect when one exists. Otherwise continue.
3. Any other public path calls `next()` without a lookup, as today.

This keeps `/scalar` and `/openapi.json` lookup-free. `harden-access-control` edits the same `publicPaths` array and removes `/signup`. This change does not touch the list's contents.

### D6. i18n fallbacks
Add these keys to `src/locales/{en,es}`:
- `inventory.json`: `group.fallback_label` ("this group" / "este grupo") and `device.fallback_label` ("this device" / "este dispositivo").
- `credentials.json`: `delete.fallback_label` ("this credential" / "esta credencial").

Use them as `group?.name ?? t("group.fallback_label")`. `scripts/check-translations.ts` must still pass.

### D7. Folder card: stretched link
- Drop `role="link"`, `tabIndex`, `onClick` and `onKeyDown` from the `Card`.
- Render the folder title as `<a href={openHref}>`, with an `after:absolute after:inset-0` pseudo-element that covers the card.
- Give the action area (`[data-slot="card-action"]`) `relative z-10` so its buttons stay clickable and focusable in their own right.
- Keep the drag-and-drop handlers on the `Card`, and keep the disabled or pending look while `isDeleting`. While deleting, render the title as plain text instead of a link.

*Alternative considered:* keeping `role="link"` and moving the buttons out of the card. That changes the visual design, and the stretched link is the idiomatic pattern.

## Risks / Trade-offs

- **[Risk]** `queryClient.clear()` while observers are mounted (the sign-out click happens on a page with active queries) may trigger an immediate refetch that 401s before `navigate` runs. → **Mitigation:** the refetch result is discarded on navigation. Better still, call `clear()` after `signOut()`, where any refetch fails quietly, and the 401 has no global error toast. Verify manually that no toast flashes.
- **[Risk]** Removing page-level toasts relies on every hook going through a toasting helper. → **Mitigation:** the tasks audit each changed handler's hook, and the raw assign/unassign hooks move onto `useOrpcMutation`.
- **[Risk]** The `/login` session lookup adds one backend call per login page view. → **Mitigation:** it is negligible, and it runs only on `/login`.
- **[Trade-off]** `detailKey` builds each hook's detail key from `input.id`. Hooks whose input carries no `id` can't use it. All current update and delete hooks do carry one.

## Migration Plan

This is a pure frontend change with no data or API impact. It deploys with the normal frontend image, and rollback means reverting the commit. Apply it after, or rebase it onto, `harden-access-control` because of the shared `middleware.ts` `publicPaths` edit.

## Open Questions

- Should a signed-in user visiting `/signup` also be redirected? Moot if `harden-access-control` removes the route, so it is deferred to that change.
