## 1. Access-control primitives (packages/api, packages/auth)

- [x] 1.1 In `packages/api/src/index.ts`, make `requireAuth` throw `errors.FORBIDDEN()` when `context.user.role === "pending"`, and add `requireAdmin` + exported `adminProcedure = protectedProcedure.use(requireAdmin)`
- [x] 1.2 In `packages/auth/src/index.ts`, set `emailAndPassword.disableSignUp: true` and change `defaultCookieAttributes.sameSite` to `"lax"`; leave genericOAuth implicit sign-up enabled
- [x] 1.3 Verify with a manual call that `POST /api/auth/sign-up/email` is rejected and sign-in still works

## 2. CSRF protection

- [x] 2.1 Register `SimpleCsrfProtectionHandlerPlugin` on the `RPCHandler` in `apps/backend/src/routers/rpc.ts` and the `OpenAPIHandler` in `apps/backend/src/routers/docs.ts`, with `exclude` returning true when the request headers carry `x-api-key` or `authorization`
- [x] 2.2 Send `x-csrf-token: orpc` from the frontend `RPCLink` in `apps/frontend/src/lib/orpc.ts`
- [x] 2.3 Verify that a cookie-only `POST /api/v1/...` without the header returns 403, that an API-key call succeeds, and that the frontend works end to end; check whether Scalar can send the header and document the outcome

## 3. Credentials: no secret in outputs, admin-only writes, encryption at rest

- [x] 3.1 Add `CREDENTIALS_ENCRYPTION_KEY` (base64, exactly 32 decoded bytes) to `packages/env/src/server.ts` and document it in `apps/backend/.env.example` and `compose.yml`
- [x] 3.2 Create `packages/api/src/v1/credentials/crypto.ts` with `encryptSecret`/`decryptSecret` (AES-256-GCM, `v1:iv:tag:ct` format, plaintext passthrough for non-prefixed legacy values)
- [x] 3.3 Create `packages/api/src/v1/credentials/output.ts` with the public credential schema (no `privateKey`) and the `generate` key-pair schema; move the schemas out of `router.ts`
- [x] 3.4 Make `privateKey`/`publicKey` optional in `credentialsInput.update`
- [x] 3.5 Update `credentialsHandler`: encrypt on create/update, keep the stored key when update omits it, select explicit public columns in list/get and in the `returning()` calls, and set `updatedAt` on update
- [x] 3.6 Switch `create`, `update`, `delete` and `generate` in `credentials/router.ts` to `adminProcedure` and the new output schemas
- [x] 3.7 Decrypt private keys in `packages/api/src/v1/run/handler.ts` where hosts are resolved, before they are passed to `proto.ts`
- [x] 3.8 Add `apps/backend/src/scripts/encrypt-credentials.ts` (idempotent, transactional, with a `--decrypt` rollback flag) and a `credentials:encrypt` script in `apps/backend/package.json`; the agent does NOT run it against any database

## 4. Execution input safety

- [x] 4.1 Create `packages/api/src/v1/run/extravars.ts` exporting `safeExtravars` (key regex `^(?!ansible_)[A-Za-z_][A-Za-z0-9_]*$`, case-insensitive), and use it in `run/stream-input.ts` and in the jobs create/update inputs (`jobs/input.ts` and the copies in `jobs/router.ts`)
- [x] 4.2 Add a shared `inventoryName` schema (`^[A-Za-z0-9._-]{1,64}$`, excluding `.` and `..`) and apply it to group and device create/update in `packages/api/src/v1/inventory/`
- [x] 4.3 In `apps/ansible/app/grpc/services/runner.py` `RunBundle`, reject any `request.extravars` key whose lowercase form starts with `ansible_` by yielding an error frame before materialising
- [x] 4.4 In `apps/ansible/app/services/ansible/materialize.py`, sanitise the `mkstemp` prefix (`re.sub(r"[^A-Za-z0-9._-]", "_", name)[:48] or "host"`)
- [x] 4.5 In the frontend run and job forms, surface the validation error for reserved extravars and invalid names (check that the existing error toast shows the zod message)

## 5. Service token comparison

- [x] 5.1 Use `crypto.timingSafeEqual` (with a length check) in `packages/grpc/src/auth.ts`
- [x] 5.2 Use `hmac.compare_digest` in `python/grpc-toolkit/grpc_toolkit/auth.py`

## 6. Seed

- [x] 6.1 Replace `auth.api.signUpEmail` with `auth.api.createUser({ body: { email, password, name, role: "admin" } })` in `apps/backend/src/scripts/seed.ts`
- [x] 6.2 Stop printing the password, and exit with an error when `NODE_ENV === "production"` and the password equals the default `admin1234`

## 7. Frontend

- [x] 7.1 Remove `apps/frontend/src/pages/signup` and `features/auth/components/sign-up-form.tsx` (and its barrel export), add a `/signup` → `/login` redirect, remove `/signup` from `publicPaths` in `src/middleware.ts`, and remove the sign-up link from the sign-in form
- [x] 7.2 In `src/middleware.ts`, redirect `pending` users to `/me` (except on `/me` itself) and redirect non-admins away from `/admin/*`
- [x] 7.3 Add a small `useIsAdmin()` helper (session role) in `@/features/auth` or `@/lib`, and hide the credential create/generate/edit/delete controls for non-admins
- [x] 7.4 In `credential-form-modal.tsx` and `use-credentials.ts`, stop pre-filling `privateKey` in edit mode, send it only when non-empty, and add a "leave empty to keep current key" hint (en + es i18n keys)
- [x] 7.5 Create `apps/frontend/src/features/admin/` with a users page (list, create, set role, ban/unban via `authClient.admin.*`), `pages/admin/users.astro` with `client:only="react"`, and an admin-only link in the navbar and user menu, with i18n keys in en + es
- [x] 7.6 Show an explanatory "account pending approval" message on the profile page for `pending` users
- [x] 7.7 Update `apps/frontend/tests/guest.spec.ts` (no sign-up link; `/signup` redirects to `/login`)

## 8. Validation and docs

- [x] 8.1 Run `bun run check-types` and `bun run check` and fix the findings
- [ ] 8.2 Manually verify the scenarios: operator → credentials.create gives 403; list has no `privateKey`; a run with `ansible_connection` extravar gives 400; a device named `../x` gives 400; a run with an encrypted credential succeeds
- [x] 8.3 Update AGENTS.md: sign-up disabled, `adminProcedure`, `CREDENTIALS_ENCRYPTION_KEY`, the cookie `sameSite=lax`, the CSRF header, and the `credentials:encrypt` script
- [x] 8.4 Write rollout notes for the user: generate the key, deploy, run `credentials:encrypt`, promote an admin, list jobs that have `ansible_*` extravars and devices/groups with invalid names (SQL provided, user runs it)
