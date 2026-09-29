## Context

Playbook Runner is an internal tool that runs Ansible, with `become`, against a whole device fleet. The authorisation model today is binary: a session exists or it does not. Several facts combine into a problem:

- `/signup` is public.
- Every `v1.*` procedure is a `protectedProcedure`.
- `credentials.list`/`get` return `privateKey`, which is stored as plaintext in `credentials.private_key` (`text`).
- User-supplied `extravars` (`record<string,string>`) are merged last into the runner's extravars (`apps/ansible/app/grpc/services/runner.py`). Extra vars have the highest precedence in Ansible, so `ansible_ssh_common_args`, `ansible_connection=local` and similar keys give code execution inside the runner container.
- Device names are free text and flow into `tempfile.mkstemp(prefix=f"{host_name}-")`.

The user chose a **closed team** model:

- There is no public registration. Admins create accounts, and SSO is optional.
- Every authenticated, non-pending user is an operator, able to run things and edit inventory, playbooks, scripts and jobs.
- Credential secrets are managed by admins only.
- The existing Better Auth `admin()` plugin already provides the `user.role`, `banned`, `banReason` and `banExpires` columns (`packages/db/src/schema/auth.ts`), so **no schema change is needed**.

## Goals / Non-Goals

**Goals:**
- Only administrators can create email/password accounts.
- Private keys never leave the backend except towards the Ansible service, and they are encrypted at rest.
- User input cannot change how Ansible connects or escalates privilege, and cannot escape the runner's scratch directories.
- Cookie-authenticated requests are not forgeable cross-site.
- The work stays within existing tables; there is no Drizzle migration.

**Non-Goals:**
- Fine-grained RBAC (reader/operator/admin) or per-resource ownership.
- TLS on the backend↔ansible gRPC channel. It stays on the private Compose network; the `fix-compose-deploy` change stops publishing port 8000.
- Key rotation for `CREDENTIALS_ENCRYPTION_KEY`. The versioned prefix leaves room for it later.
- Run cancellation, and removing the runner's own `ansible_user` default. Both belong to `fix-run-lifecycle`.

## Decisions

### D1. Closed registration via `emailAndPassword.disableSignUp: true`
Accounts are created via `auth.api.createUser` (admin plugin) from the new user-management page or the seed script.

**Alternatives considered:**
- *Keep sign-up with default role `pending`.* This works, but it leaves an unauthenticated account-creation surface and needs an approval workflow. The user rejected it.
- *Remove the email/password provider entirely.* This would break deployments without SSO.

### D2. SSO users are auto-provisioned as `user`
The OIDC provider already decides who may log in, so a second approval step adds friction without adding security. `genericOAuth` does not honour `emailAndPassword.disableSignUp`, and we leave its implicit sign-up enabled.

If a deployment wants SSO users to start blocked, it can set the admin plugin's `defaultRole` to `pending` later. The `pending` gate in D3 makes that a one-line switch.

### D3. `requireAuth` rejects `pending`; new `requireAdmin` middleware
In `packages/api/src/index.ts`:

- `protectedProcedure = publicProcedure.use(requireAuth)`. `requireAuth` now also throws `errors.FORBIDDEN()` when `context.user.role === "pending"`.
- `adminProcedure = protectedProcedure.use(requireAdmin)`, which throws `errors.FORBIDDEN()` unless `role === "admin"`.

Nothing in the codebase sets `pending` today, although the frontend profile page renders it. Making it a real "no access" state gives it a meaning, and admins can park accounts there without banning them.

Banned users are already rejected by the admin plugin at session creation. We rely on that and do not duplicate the check.

The frontend middleware (`src/middleware.ts`) mirrors both rules:

- It redirects `pending` users to `/me`, which shows their pending status.
- It redirects non-admins away from admin routes (`/admin/*`).

### D4. Credentials: split output schema, optional key on update, admin-only writes
- `credentialsOutput` (new `output.ts`) exposes `{ id, name, username, publicKey, createdAt, updatedAt }` for `create`, `list`, `get`, `update` and `delete`.
- `generate` keeps returning `{ privateKey, publicKey }`. The pair has not been persisted yet, and the admin needs the private key to install it or copy it.
- `credentialsInput.update` makes `privateKey` and `publicKey` optional; when they are absent, the handler leaves the columns untouched.
- `create`, `update`, `delete` and `generate` use `adminProcedure`. `list` and `get` stay `protectedProcedure`, because the inventory device form needs the list to assign credentials.
- The handler selects explicit columns instead of `select()`, so the ciphertext never reaches the router at all.

### D5. Encryption at rest: AES-256-GCM, app-level, same `text` column
- A new module, `packages/api/src/v1/credentials/crypto.ts`, provides `encryptSecret`/`decryptSecret`.
- It uses `node:crypto` with a 12-byte random IV. The stored value is `v1:<iv b64>:<tag b64>:<ciphertext b64>`, which is still a `text` column, so no schema change is needed.
- The key comes from `CREDENTIALS_ENCRYPTION_KEY`, a base64-encoded 32 bytes, validated in `@playbook-runner/env/server` with an exact decoded-length check. Generate it with `openssl rand -base64 32`.
- Decryption happens only in `run/handler.ts` where hosts are resolved (the three `privateKey:` sites), immediately before building the gRPC request.
- `decryptSecret` treats values without a `v1:` prefix as legacy plaintext and returns them as-is. Running systems therefore keep working between deploy and re-encryption.
- `apps/backend/src/scripts/encrypt-credentials.ts` (the `bun run credentials:encrypt` script) re-encrypts every non-prefixed row in a transaction and is idempotent. This is a **data** migration run by the user, not a Drizzle migration.

**Alternatives considered:**
- *pgcrypto.* It would need an extension and SQL changes.
- *Envelope encryption / KMS.* Overkill for a self-hosted tool.
- *Storing only a key reference.* It would change the schema.

### D6. Reserved extravars: shared zod refinement + runner guard
- **Backend.** Add a single `safeExtravars` schema, `z.record(z.string().regex(/^(?!ansible_)[A-Za-z_][A-Za-z0-9_]*$/i), z.string())`, in a small shared module (`packages/api/src/v1/run/extravars.ts`). It is used by `streamInput.run.extravars` and by the jobs create/update inputs.
- **Runner.** In `RunBundle`, before merging, abort with an error frame if any key lower-cased starts with `ansible_`.
- **Existing jobs.** Jobs whose `extravarsJson` already holds such keys fail at execution time on the runner side, which is the intended outcome, and show the error in the job run.

**Alternative considered:** a denylist of specific dangerous variables. It is brittle, because Ansible has dozens of connection and become variables; the `ansible_` prefix covers them all.

### D7. Inventory name regex, plus sanitised key-file prefix
- **Backend.** Add `inventoryName = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/).refine(n => n !== "." && n !== "..")`, used by the group and device create/update inputs.
- **Runner.** Apply `_safe_prefix(name) = re.sub(r"[^A-Za-z0-9._-]", "_", name)[:48] or "host"` in `materialize._write_key_file` as defence in depth, since existing rows may already have unsafe names. `mkstemp` never interprets `/` in a sanitised prefix.
- **Existing unsafe rows.** They are not rewritten. Users must rename them before editing, because updates are validated.

### D8. CSRF: `sameSite=lax` + oRPC `SimpleCsrfProtectionHandlerPlugin`
`sameSite=none` is unnecessary:

- In dev, the browser talks to `localhost:4321`, and Vite proxies to `:3000`. The auth client's `PUBLIC_SERVER_URL` of `http://localhost:3000` is *same-site*, because the port is not part of the site.
- In Docker everything is same-origin through Caddy.

`lax` therefore keeps all flows working and stops the browser from attaching the cookie to cross-site POSTs. OAuth callbacks are top-level GET navigations, which `lax` allows.

As defence in depth:

- Register `SimpleCsrfProtectionHandlerPlugin` on both `RPCHandler` (`apps/backend/src/routers/rpc.ts`) and `OpenAPIHandler` (`docs.ts`).
- Its `exclude` option returns `true` when the request context headers contain `x-api-key` or `authorization`, since those clients have no ambient credentials.
- The frontend `RPCLink` (`apps/frontend/src/lib/orpc.ts`) sends `x-csrf-token: orpc`, the plugin's default header and value.

### D9. Seed through the admin API
- `seed.ts` calls `auth.api.createUser({ body: { email, password, name, role: "admin" } })`. This is server-side, so no session is required. It replaces `signUpEmail`, which D1 disables.
- The seed no longer logs the password.
- `seed.ts` itself exits with an error when `NODE_ENV === "production"` and `SEED_ADMIN_PASSWORD` equals `admin1234`, the env default. The check lives in the seed entrypoint and not in the env schema, so it never blocks backend startup.

### D10. Constant-time token checks
- The TypeScript interceptor (`packages/grpc/src/auth.ts`) compares with `crypto.timingSafeEqual` on equal-length buffers; a length mismatch is rejected.
- The Python side (`python/grpc-toolkit/grpc_toolkit/auth.py`) uses `hmac.compare_digest`.

### D11. Frontend
- **Sign-up removal.** Delete `pages/signup` and `features/auth/components/sign-up-form.tsx`, plus its export. Add an Astro redirect `/signup → /login`, remove `/signup` from `publicPaths`, and remove the sign-up link from the login form.
- **User-admin page.** Add a new `features/admin/` feature with a `/admin/users` page (`client:only="react"`). It uses `authClient.admin.listUsers`, `createUser`, `setRole`, `banUser` and `unbanUser`. The navbar and user menu link to it only when `user.role === "admin"`.
- **Credentials page:**
  - Read the role from the session and hide the create, generate, edit and delete controls for non-admins.
  - The edit modal starts with an empty private-key field, labelled "leave empty to keep current key".
- **Profile page.** For `pending` users, show an explanatory message.

## Risks / Trade-offs

- **[Existing operators lose credential editing]** → The first admin must be set up. Document `UPDATE "user" SET role='admin' WHERE email=…` as a user-run step, or re-running the seed with a new email.
- **[Lost `CREDENTIALS_ENCRYPTION_KEY` makes all keys unrecoverable]** → Document the variable prominently in `.env.example` and the README, and advise backing it up like `BETTER_AUTH_SECRET`.
- **[Deploy ordering]** → The new backend must be deployed before the re-encryption script runs, because the old backend would send ciphertext to Ansible. The legacy-plaintext fallback allows deploy first and encryption later.
- **[Scalar "try it" with cookie auth now needs the CSRF header]** → Recommend an API key in Scalar, or configure Scalar's default headers (see Open Questions).
- **[Jobs with existing `ansible_*` extravars start failing]** → This is intended. List the affected jobs in the rollout notes, via a `SELECT` query the user can run.
- **[Existing device/group names that fail the regex can't be edited without renaming]** → The UI surfaces the validation message. The rename is a one-off manual step.
- **[`sameSite=lax` breaks deployments where frontend and backend are on different sites]** → No supported deployment does this: dev is same-site and Docker is same-origin. Note it in AGENTS.md.

## Migration Plan

1. The user generates `CREDENTIALS_ENCRYPTION_KEY` and adds it to `apps/backend/.env`, `compose.yml`/secrets, and the `.env.example` files.
2. Deploy the backend, frontend and Ansible service together. Plaintext keys keep working through the legacy fallback.
3. The user runs `bun run credentials:encrypt` once per environment.
4. If no user has role `admin` yet, the user promotes one via SQL or runs the seed with a fresh email.
5. **Rollback:** reverting code is safe until step 3. After step 3, the old code would send ciphertext, so a rollback needs a decrypt run of the same script (`--decrypt` flag) first.

## Open Questions

- Does the Scalar build used by `@orpc/openapi` expose a way to inject default request headers? If not, document the API key as the only way to use "try it".
- Should SSO-provisioned users start as `pending`? Default is no (D2). Revisit if the IdP group is broader than the ops team.
