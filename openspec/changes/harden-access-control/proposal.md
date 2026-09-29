## Why

Today anyone who can reach `/signup` gets a full operator account. Every feature router uses `protectedProcedure`, which only checks that a session exists. As a result, a self-registered user can:

- read every stored SSH private key in plaintext (`credentials.list`/`get` return `privateKey`);
- run commands with `become` on every device;
- inject connection-altering `ansible_*` extra vars that execute code inside the runner container.

The app is meant for a closed operations team, so this needs to be locked down before it is exposed to any network.

## What Changes

- **BREAKING**: Disable public email/password sign-up. The `/signup` page is removed and redirects to `/login`. Accounts are created by an administrator. SSO (generic OIDC) remains available, and the configured identity provider acts as the gatekeeper.
- Add a minimal **user administration page**, admin only, to list users, create users, change roles and ban/unban. It is built on the existing Better Auth `admin()` client plugin.
- Add an `adminProcedure` builder in `packages/api` that throws `FORBIDDEN` for non-admins. `protectedProcedure` additionally rejects users with the `pending` role.
- **BREAKING**: Credentials API changes:
  - `privateKey` is never returned by any credentials procedure.
  - `privateKey` is optional on update; omitting it keeps the current key.
  - `create`, `update`, `delete` and `generate` are admin only.
  - `list` and `get` remain available to operators and return metadata plus `publicKey`.
- Encrypt credential private keys at rest with AES-256-GCM, keyed by a new required `CREDENTIALS_ENCRYPTION_KEY` env var. The existing `text` column is reused and there is no schema change. A one-off re-encryption script, run by the user, converts existing plaintext rows.
- Reject user-supplied extra vars that alter connection or privilege behaviour (`ansible_*` and similar). The check runs in the backend zod input for runs and jobs, and again as defence in depth in the Python runner.
- Restrict device and group names to `^[A-Za-z0-9._-]{1,64}$`. Sanitise the host-derived prefix used for key-file names in the runner so a name can never escape the key directory.
- Change session cookies from `sameSite=none` to `sameSite=lax`. Add oRPC CSRF protection to the OpenAPI handler (`/api/*`).
- Changes to the seed script:
  - Create the admin through the admin API with `role: "admin"`.
  - Stop printing the password.
  - Refuse the default password when `NODE_ENV=production`.
- Compare gRPC service tokens in constant time in both the TypeScript and Python interceptors.
- Frontend changes:
  - Hide credential write actions and the user-admin navigation from non-admins.
  - The credential edit form no longer pre-fills the private key.

## Capabilities

### New Capabilities
- `ssh-credential-management`: This capability covers who may manage SSH credentials, the rule that private keys are never returned by the API, and encryption of private keys at rest.
- `execution-input-safety`: This capability covers validation of user-controlled values that reach Ansible: reserved extra vars, device and group names, and key-file naming.

### Modified Capabilities
- `authentication`: Email/password becomes sign-in only, with public sign-up disabled. Cookies move from `sameSite=none` to `sameSite=lax`. The spec adds SSO provisioning behaviour.
- `rpc-api`: Protected procedures also reject `pending` users. The spec adds an admin procedure builder and CSRF protection on the OpenAPI handler.
- `admin`: The spec adds the seeded administrator and the admin-only user management page.

## Impact

- **Backend / API**:
  - `packages/api/src/index.ts`: new `adminProcedure`, and the pending check in `requireAuth`.
  - `packages/api/src/v1/credentials/*`: output schema, input, handler encryption.
  - `packages/api/src/v1/run/*`, `jobs/*`, `inventory/*`: input validation.
  - `apps/backend/src/routers/docs.ts`: CSRF plugin.
  - `apps/backend/src/scripts/seed.ts`.
- **Auth**: `packages/auth/src/index.ts` (`disableSignUp`, cookie attributes).
- **Env**: `packages/env/src/server.ts`: new required `CREDENTIALS_ENCRYPTION_KEY` and production seed-password rule. `.env.example` files and `compose.yml` must add the new variable.
- **Ansible service**:
  - `apps/ansible/app/grpc/services/runner.py`: extravars filter.
  - `apps/ansible/app/services/ansible/materialize.py`: filename sanitising.
  - `python/grpc-toolkit/grpc_toolkit/auth.py`: constant-time compare.
- **gRPC TS**: `packages/grpc/src/auth.ts`.
- **Frontend**:
  - The `/signup` page and `sign-up-form.tsx` are removed.
  - `src/middleware.ts` no longer lists `/signup` as a public path.
  - Credentials feature: admin gating and the new form behaviour.
  - A new admin users page.
  - Playwright tests in `apps/frontend/tests/guest.spec.ts`.
- **User-owned steps**:
  - Generate and set `CREDENTIALS_ENCRYPTION_KEY` in every environment.
  - Run the credential re-encryption script once per database.
  - Promote at least one existing user to `admin` if the database predates the new seed.
  - No Drizzle schema change or migration is required.
- **Coordination**: `fix-run-lifecycle` removes the runner's own `ansible_user` default. This change only filters *user-supplied* extravars and does not overlap with it.
