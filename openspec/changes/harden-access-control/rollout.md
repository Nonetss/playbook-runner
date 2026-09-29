# Rollout notes: harden-access-control

Every step below is run by the user. The agent ran none of them.

## 1. Encryption key

Generate a key and add it to every environment. Back it up like `BETTER_AUTH_SECRET`: without it the stored keys can't be recovered.

```bash
openssl rand -base64 32
```

- Local dev: `apps/backend/.env`. A dev key was already appended during implementation.
- Docker (`compose.yml`): `apps/backend/.env`.
- Production (`compose.prod.yml`): the root `.env` (`CREDENTIALS_ENCRYPTION_KEY=`).

The backend refuses to start without it.

## 2. Deploy

Deploy the backend, frontend and ansible images together. Private keys that are still plaintext keep working through the legacy fallback.

## 3. Encrypt existing private keys, once per database

```bash
# local
bun run --filter backend credentials:encrypt
# production image
docker compose -f compose.prod.yml exec backend bun dist/encrypt-credentials.mjs
```

The script is idempotent and transactional. To roll back to an older image after encrypting, first run the same command with `--decrypt`.

## 4. Make sure an admin exists

The seed only creates an admin for a new email address, and existing accounts keep role `user`. Promote at least one account:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
```

In production the seed refuses to create an admin while `SEED_ADMIN_PASSWORD` is still the default `admin1234`.

## 5. Find data the new validation rejects

These are read-only queries.

Jobs with reserved extra vars will now fail at run time:

```sql
SELECT id, name FROM jobs
WHERE EXISTS (SELECT 1 FROM jsonb_object_keys(extravars_json) k WHERE lower(k) LIKE 'ansible\_%');
```

Devices and groups whose names fail the new rule can't be edited until they are renamed:

```sql
SELECT 'device' AS kind, id, name FROM inventory_devices WHERE name !~ '^[A-Za-z0-9._-]{1,64}$' OR name IN ('.', '..')
UNION ALL
SELECT 'group', id, name FROM inventory_groups WHERE name !~ '^[A-Za-z0-9._-]{1,64}$' OR name IN ('.', '..');
```

## 6. Clients

- Scripts that call `/api/*` or `/rpc/*` with a session cookie must send `x-csrf-token: orpc`. API-key clients are unaffected.
- `credentials.*` responses no longer include `privateKey`. `create`, `update`, `delete` and `generate` now require the admin role.
