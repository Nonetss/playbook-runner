---
title: Usuarios e inicio de sesión
description: Roles, el primer administrador, inicio de sesión único con cualquier proveedor OIDC y API keys.
order: 6
---

Playbook Runner está pensado para un equipo cerrado. No hay registro público: cada cuenta la crea un administrador o se da de alta mediante inicio de sesión único.

## Roles

| Rol | Puede |
| --- | --- |
| `admin` | Todo, incluido crear usuarios y cambiar roles en la página **Usuarios** (`/admin/users`). |
| `user` | Usar toda la app: inventario, credenciales, playbooks, scripts, comandos, jobs e historial. |
| `pending` | Iniciar sesión, pero nada más hasta que un administrador le asigne otro rol. |

## El primer administrador

Cada vez que arranca, el backend crea el administrador descrito por `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y `SEED_ADMIN_NAME` si ese usuario aún no existe. Cambiar estas variables después no modifica una cuenta existente. En producción se niega a crearlo con la contraseña por defecto `admin1234`.

## Inicio de sesión único (OIDC)

El acceso con email y contraseña siempre está disponible. Para añadir un proveedor de identidad corporativo (Keycloak, Authentik, Google o cualquiera compatible con OIDC), registra un cliente en el proveedor y define tres variables:

```bash
GENERIC_OAUTH_CLIENT_ID=playbook-runner
GENERIC_OAUTH_CLIENT_SECRET=...
GENERIC_OAUTH_ISSUER=https://keycloak.example.com/realms/ops
```

El issuer es la URL base; se le añade `/.well-known/openid-configuration` para descubrir los endpoints. Se piden los scopes `openid`, `profile` y `email`. Permite esta URI de redirección en el proveedor:

```text
https://ansible.example.com/api/auth/oauth2/callback/generic
```

Si alguna de las tres variables está vacía, el SSO queda desactivado y la app arranca solo con email y contraseña. La vinculación de cuentas está activada: quien entró primero con contraseña puede entrar después por SSO con el mismo email y conservar la misma cuenta.

## API keys

Cualquier usuario puede crear API keys personales desde la página **API keys**. Envíala en la cabecera `x-api-key`; las peticiones autenticadas así actúan como ese usuario y no pasan por la comprobación CSRF que necesitan las sesiones del navegador.

```bash
curl -H "x-api-key: $PLAYBOOK_RUNNER_KEY" https://ansible.example.com/api/v1/playbooks/list
```

La referencia interactiva de `/scalar` acepta la misma clave, así que puedes probar cada endpoint desde el navegador.
