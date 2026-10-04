---
title: Configuración
description: Todas las variables de entorno que leen el backend y el ejecutor de Ansible.
order: 4
---

Toda la configuración se lee de variables de entorno. En un despliegue con Docker viven en el `.env` junto a `compose.yml`, que leen todos los servicios. El backend valida sus variables al arrancar y termina con un error claro si falta alguna o tiene un formato incorrecto.

## Despliegue

Las lee el propio `compose.yml`.

| Variable | Por defecto | Notas |
| --- | --- | --- |
| `GATEWAY_PORT` | `4321` | Puerto del host donde se publica el gateway. Si no existe, usa el antiguo `FRONTEND_PORT`. |
| `ANSIBLE_IMAGE_TAG` | `latest` | Etiqueta de la imagen del ejecutor. |
| `BACKEND_IMAGE_TAG` | `latest` | Etiqueta de la imagen del backend. |
| `FRONTEND_IMAGE_TAG` | `latest` | Etiqueta de la imagen del frontend. |
| `GATEWAY_IMAGE_TAG` | `latest` | Etiqueta de la imagen del gateway. |
| `POSTGRES_DB` | `playbook_runner` | Solo para el PostgreSQL incluido. |
| `POSTGRES_USER` | `playbook_runner` | Solo para el PostgreSQL incluido. |
| `POSTGRES_PASSWORD` | obligatoria | Solo para el PostgreSQL incluido. |

## Backend

| Variable | Obligatoria | Notas |
| --- | --- | --- |
| `DATABASE_URL` | sí | Cadena de conexión de PostgreSQL. |
| `BETTER_AUTH_SECRET` | sí | Al menos 32 caracteres. Firma las sesiones. |
| `BETTER_AUTH_URL` | sí | URL pública de la app, tal como la ve el navegador. |
| `CORS_ORIGIN` | sí | URL pública de la app. |
| `CREDENTIALS_ENCRYPTION_KEY` | sí | Base64 de exactamente 32 bytes. Cifra las claves privadas SSH guardadas (AES-256-GCM). Haz copia. |
| `SERVICE_TOKEN` | para ejecutar | Al menos 32 caracteres, el mismo valor en el ejecutor. Autentica las llamadas gRPC; sin él la app arranca pero no se puede ejecutar nada. |
| `ANSIBLE_GRPC_TARGET` | no | Dónde llama el backend al ejecutor. `compose.yml` lo fija en `gateway:50050`. |
| `JOB_SCHEDULER_ENABLED` | no | `1` (por defecto) ejecuta los jobs programados dentro del proceso; `0` desactiva el scheduler, por ejemplo si tienes varias réplicas del backend. |
| `SEED_ADMIN_EMAIL` | no | Primer administrador, creado al arrancar si no existe. Por defecto `admin@playbook-runner.local`. |
| `SEED_ADMIN_PASSWORD` | no | Por defecto `admin1234`, que se rechaza en producción. |
| `SEED_ADMIN_NAME` | no | Por defecto `Admin`. |
| `GENERIC_OAUTH_CLIENT_ID` | no | Las tres variables `GENERIC_OAUTH_*` juntas activan el SSO. |
| `GENERIC_OAUTH_CLIENT_SECRET` | no | Consulta [Usuarios e inicio de sesión](../authentication/). |
| `GENERIC_OAUTH_ISSUER` | no | URL del issuer OIDC; el descubrimiento se añade automáticamente. |
| `LOG_LEVEL` | no | `info` por defecto. |

## Ejecutor de Ansible

| Variable | Por defecto | Notas |
| --- | --- | --- |
| `SERVICE_TOKEN` | obligatoria | Debe coincidir con la del backend. Vacía, se rechazan todas las llamadas. |
| `SSH_HOST_KEY_POLICY` | `accept-new` | `accept-new` confía en un host en el primer contacto y rechaza claves que cambian; `strict` solo acepta hosts que ya están en `known_hosts`; `off` desactiva la verificación y deja un aviso en el log. |
| `MAX_CONCURRENT_RUNS` | `8` | Procesos de Ansible permitidos a la vez (ejecuciones, scripts, comandos). Las peticiones de más se rechazan, no se encolan. |
| `GRPC_SHUTDOWN_GRACE_S` | `8` | Segundos que tienen las ejecuciones en curso para cancelarse cuando se para el contenedor. |
| `GIT_TIMEOUT_S` | `120` | Tiempo máximo de cada comando Git durante una sincronización. |
| `GIT_MAX_REPO_MB` | `512` | Un mirror mayor que esto se descarta y la sincronización falla. |
| `MAX_CONCURRENT_SYNCS` | `2` | Sincronizaciones de repositorios permitidas a la vez. |
| `ANSIBLE_USER` | `ansible` | Usuario SSH de reserva. Normalmente cada host se conecta con el usuario de su credencial. |
| `LOG_LEVEL` | `info` | |

## Claves de host

Con `accept-new`, si un host se reinstala de verdad su nueva clave se rechaza. Borra su línea de `known_hosts` en el volumen `ansible_state` y la siguiente ejecución guardará la nueva:

```bash
docker compose exec ansible ssh-keygen -f /app/state/known_hosts -R 10.0.0.12
```
