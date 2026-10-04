---
title: Desplegar con Docker Compose
description: Instala a mano con compose.prod.yml, ponlo detrás de HTTPS, fija versiones o usa un PostgreSQL externo.
order: 3
---

El instalador solo automatiza estos pasos. Haciéndolos a mano obtienes el mismo stack: cinco contenedores de `compose.prod.yml` (gateway, frontend, backend, ejecutor de Ansible y PostgreSQL), con solo el gateway publicado en el host.

## 1. Descarga los ficheros

En un directorio vacío del servidor:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/.env.example -o .env
chmod 600 .env
```

## 2. Genera los secretos

Sustituye cada `CHANGE_ME` de `.env`:

| Variable | Generar con |
| --- | --- |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
| `SERVICE_TOKEN` | `openssl rand -base64 48` |
| `CREDENTIALS_ENCRYPTION_KEY` | `openssl rand -base64 32` |

Usa hexadecimal para la contraseña de la base de datos: acaba dentro de `DATABASE_URL`, donde `/`, `+` y `=` habría que escaparlos.

`SERVICE_TOKEN` autentica el enlace gRPC entre el backend y el ejecutor. Si está vacío, el ejecutor rechaza todas las llamadas y no se puede lanzar ninguna ejecución.

> Haz copia de `.env`. Sin `CREDENTIALS_ENCRYPTION_KEY`, las claves SSH guardadas en la base de datos no se pueden descifrar.

## 3. Define la URL pública

El navegador, Better Auth y CORS tienen que coincidir en un único origen:

```bash
GATEWAY_PORT=4321
BETTER_AUTH_URL=https://ansible.example.com
CORS_ORIGIN=https://ansible.example.com
```

Define también el primer administrador (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`). En producción el backend se niega a crearlo con la contraseña por defecto `admin1234`.

## 4. Arranca el stack

```bash
docker compose up -d
docker compose ps
```

Al arrancar, el backend aplica las migraciones y crea el administrador si aún no existe, así que basta con `up -d`. Su healthcheck da dos minutos para ello con una base de datos nueva. El frontend espera al backend, y el backend espera a PostgreSQL, al ejecutor y al gateway.

## Detrás de HTTPS

Las cookies de sesión llevan el atributo `Secure`, así que los navegadores solo las guardan por HTTPS o en `localhost`: cuenta con HTTPS para cualquier acceso desde otras máquinas.

El gateway sirve HTTP plano en el puerto publicado. Pon delante tu proxy inverso habitual (Caddy, Traefik, nginx…), termina el TLS ahí y reenvía todo a `GATEWAY_PORT`. Deja `BETTER_AUTH_URL` y `CORS_ORIGIN` con la URL `https://` que ve el navegador.

El frontend y la API se sirven desde el mismo origen, así que no hay nada más que enrutar: dentro del gateway, `/rpc`, `/api`, `/scalar` y `/openapi.json` van al backend y todo lo demás al frontend.

## Fijar una versión

Las imágenes se publican en `ghcr.io/nonetss/playbook-runner-*` para `linux/amd64` y `linux/arm64`. `latest` es la compilación más reciente; cada versión se publica además con su etiqueta (`v0.11.0`). Fija las cuatro a la vez en `.env`:

```bash
ANSIBLE_IMAGE_TAG=v0.11.0
BACKEND_IMAGE_TAG=v0.11.0
FRONTEND_IMAGE_TAG=v0.11.0
GATEWAY_IMAGE_TAG=v0.11.0
```

Lee [Actualizar](../upgrading/) antes de cambiar de versión.

## PostgreSQL externo

Para usar una base de datos gestionada (RDS, Cloud SQL…), borra el servicio `postgres` y su entrada en `depends_on` de `compose.yml`, y apunta `DATABASE_URL` a ella:

```bash
DATABASE_URL=postgresql://usuario:contraseña@db.example.com:5432/playbook_runner
```

## Datos y volúmenes

| Volumen | Contiene |
| --- | --- |
| `postgres_data` | Todo lo que creas en la app: usuarios, inventario, credenciales, playbooks, jobs e historial. |
| `ansible_state` | El `known_hosts` SSH del ejecutor y los mirrors de los repositorios Git. |

Haz copia de la base de datos y de `.env`. El volumen `ansible_state` se puede reconstruir: los mirrors se vuelven a sincronizar y las claves de host se aprenden de nuevo en el primer contacto (con la política por defecto).

## Depurar el ejecutor

La API HTTP del ejecutor (health y documentación OpenAPI en el puerto `8000`) es interna. Para llegar a ella desde el host mientras depuras, arranca el stack con el overlay de depuración del repositorio:

```bash
docker compose -f compose.yml -f compose.debug.yml up -d
```
