---
title: Users and sign-in
description: Roles, the first admin, single sign-on with any OIDC provider, and API keys.
order: 6
---

Playbook Runner is built for a closed team. There is no public sign-up: every account is created by an admin or provisioned through single sign-on.

## Roles

| Role | Can |
| --- | --- |
| `admin` | Everything, including creating users and changing roles on the **Users** page (`/admin/users`). |
| `user` | Use the whole app: inventory, credentials, playbooks, scripts, commands, jobs and history. |
| `pending` | Sign in, but nothing else until an admin assigns another role. |

## The first admin

The backend creates the admin described by `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME` every time it starts, if that user does not exist yet. Changing these variables later does not modify an existing account. In production it refuses to create the admin with the default password `admin1234`.

## Single sign-on (OIDC)

Email and password sign-in is always available. To add a corporate identity provider (Keycloak, Authentik, Google or anything OIDC-compliant), register a client in the provider and set three variables:

```bash
GENERIC_OAUTH_CLIENT_ID=playbook-runner
GENERIC_OAUTH_CLIENT_SECRET=...
GENERIC_OAUTH_ISSUER=https://keycloak.example.com/realms/ops
```

The issuer is the base URL; `/.well-known/openid-configuration` is appended to discover the endpoints. The scopes requested are `openid`, `profile` and `email`. Allow this redirect URI in the provider:

```text
https://ansible.example.com/api/auth/oauth2/callback/generic
```

If any of the three variables is empty, SSO stays off and the app boots with email and password only. Account linking is enabled: someone who first signed in with a password can later sign in through SSO with the same email and keep the same account.

## API keys

Any user can create personal API keys from the **API keys** page. Send one in the `x-api-key` header; requests authenticated this way act as that user and skip the CSRF check that browser sessions need.

```bash
curl -H "x-api-key: $PLAYBOOK_RUNNER_KEY" https://ansible.example.com/api/v1/playbooks/list
```

The interactive reference at `/scalar` accepts the same key, so you can try every endpoint from the browser.
