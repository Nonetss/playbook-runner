## 1. Session-scoped cache

- [x] 1.1 In `features/app-shell/components/user-nav.tsx`, call `getQueryClient().clear()` after `authClient.signOut()` in a `finally`, before `navigate("/login")`.
- [x] 1.2 In `features/auth/components/sign-in-form.tsx`, call `getQueryClient().clear()` in the email sign-in `onSuccess` before `navigate("/")`.
- [ ] 1.3 Verify manually: sign in as A and open `/inventory`, sign out, sign in as B within 60 s. B's inventory must load fresh, with no flash of A's data and no error toast during sign-out.

## 2. Detail query sync in `useResourceMutation`

- [x] 2.1 Add a `detailKey?: (input: TInput) => QueryKey` option, plus a delete mode (e.g. `removeDetail?: boolean`). In `onSettled`, invalidate `detailKey(input)` for updates. On success, `removeQueries` it for deletes. Update the JSDoc.
- [x] 2.2 Pass `detailKey` from `useScriptUpdate`/`useScriptDelete` using `orpc.scripts.get.queryKey({ input: { id } })`.
- [x] 2.3 Do the same for `usePlaybookUpdate`/`usePlaybookDelete`.
- [x] 2.4 Do the same for `useGroupUpdate`/`useGroupDelete` and `useDeviceUpdate`/`useDeviceDelete`.
- [x] 2.5 Do the same for `useCredentialUpdate`/`useCredentialDelete`.
- [x] 2.6 In `useJobUpdate`, replace the ad-hoc `mutateAsync` wrapper with `detailKey`. Add `detailKey` to `useJobDelete` and `useJobToggleEnabled`.
- [ ] 2.7 Verify manually: edit a script, save, reopen Edit within 60 s, and confirm the new values show. Rename a group, then open its detail page and confirm the new name shows.

## 3. One toast per failure, no unhandled rejections

- [x] 3.1 Remove the page-level `notifyError` from these handlers. Keep a bare `catch` only where sequencing needs it, otherwise use `mutate`:
  - `scripts-page.tsx` delete
  - `inventory-page.tsx` group delete and device delete
  - `playbooks-page.tsx` delete
  - `jobs-page.tsx` delete and toggle
  - `credentials-page.tsx` delete
- [x] 3.2 Move `useDeviceGroupAssign`/`useDeviceGroupUnassign` (`features/inventory/hooks/use-device-groups.ts`) onto `useOrpcMutation`. Use the `inventory:relations.create_error`/`relations.remove_error` error messages and keep the existing invalidation.
- [x] 3.3 Remove the now-duplicate `notifyError`/`notifySuccess` calls in `features/inventory/components/relations-dialog.tsx`. Keep any success toast only if the hook doesn't emit one.
- [x] 3.4 In `group-detail-page.tsx`, catch the delete failure so `navigate("/inventory")` runs only on success. Switch the toggle-device handler to `mutate`.
- [x] 3.5 Catch the rejection in `job-detail-page.tsx` `handleRunNow` without an extra toast, so `focusRun`/`watch.start` run only on success.
- [x] 3.6 Catch the rejection in `config-page.tsx` API key delete without an extra toast.
- [x] 3.7 Remove the translation keys that are no longer referenced (e.g. `*.delete_error`, `toggle_error`) from both `en` and `es`, but only if nothing else uses them.
- [ ] 3.8 Verify manually with the backend stopped. Each delete, toggle, assign, run-now and API key delete must show exactly one error toast and no `Uncaught (in promise)` in the console.

## 4. Run-stream lifecycle

- [x] 4.1 Hoist `subscribe` to module scope in these files:
  - `use-run-command.ts`
  - `use-run-playbook.ts`
  - `use-run-script.ts`
  - `use-ping-device.ts`
- [x] 4.2 In `ping-device-modal.tsx`, add `start`, `reset` and `stopWatching` to the effect deps and return `stopWatching` as the cleanup.
- [ ] 4.3 Verify manually: start a ping, close the modal mid-run, and confirm in the network tab that the stream request is closed and no further events reach state.

## 5. Route guard

- [x] 5.1 In `src/middleware.ts`, replace `startsWith(p)` with `path === p || path.startsWith(`${p}/`)`. Leave the contents of `publicPaths` untouched; `harden-access-control` owns them.
- [x] 5.2 On `/login`, look up the session and redirect to `/` when it is valid. Other public paths keep skipping the lookup.
- [ ] 5.3 Verify manually:
  - Anonymous `/login-foo` redirects to `/login`.
  - `/scalar` and its assets still load.
  - A signed-in user visiting `/login` lands on `/`.

## 6. i18n fallbacks

- [x] 6.1 Add `group.fallback_label` and `device.fallback_label` to `src/locales/{en,es}/inventory.json`, and `delete.fallback_label` to `src/locales/{en,es}/credentials.json`.
- [x] 6.2 Replace the literals `"este grupo"`, `"este dispositivo"` (`inventory-page.tsx`) and `"esta credencial"` (`credentials-page.tsx`) with those keys.
- [x] 6.3 Run `bun scripts/check-translations.ts` in `apps/frontend` and confirm it passes.

## 7. Folder card accessibility

- [x] 7.1 In `features/playbooks/components/playbook-folder-card.tsx`, make these changes:
  - Remove `role="link"`, `tabIndex`, `onClick` and `onKeyDown` from `Card`.
  - Render the title as an `<a href={openHref}>` stretched link, with an `after:absolute after:inset-0` pseudo-element.
  - Raise the card action area with `relative z-10`.
  - Keep the drag-and-drop handlers on `Card`.
  - Render the title as plain text while `isDeleting`.
- [ ] 7.2 Verify manually:
  - Tab order reaches the folder link and then each action button.
  - Enter on the link opens the folder.
  - Clicking the action buttons does not navigate.
  - Dropping a playbook on the card still moves it.

## 8. Validation

- [x] 8.1 Run `bun run check-types` and `bun run check`. Both must be clean.
- [ ] 8.2 Run the Playwright suite (`bun run test:e2e` in `apps/frontend`, with the backend running and seeded). Fix any regressions in the auth and guest projects.
