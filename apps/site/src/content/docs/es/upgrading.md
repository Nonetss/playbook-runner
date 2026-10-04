---
title: Actualizar
description: Actualiza una instalación en marcha y aplica los pasos propios de cada versión.
order: 7
---

## La actualización habitual

Desde el directorio que contiene `compose.yml` y `.env`:

```bash
docker compose pull
docker compose up -d
```

El backend aplica las migraciones nuevas de la base de datos al arrancar. Actualiza las cuatro imágenes a la vez: el backend y el ejecutor comparten un contrato gRPC.

Si fijaste versiones con las variables `*_IMAGE_TAG`, cambia antes las cuatro a la nueva etiqueta. Lee las [notas de versión](https://github.com/Nonetss/playbook-runner/releases) antes de saltar varias versiones, y aplica los pasos de abajo de cada versión que cruces.

## v0.10.0

La entrada pública salió de la imagen del frontend a una nueva imagen `playbook-runner-gateway` (Caddy), que sirve el sitio y enruta las llamadas gRPC del backend al ejecutor. El frontend ya no publica ningún puerto.

No hay variables obligatorias nuevas: el gateway se publica en `GATEWAY_PORT` y, si no existe, en tu `FRONTEND_PORT` de antes. Con el compose antiguo el sitio deja de responder tras un `pull`, así que actualízalo primero:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
docker compose pull && docker compose up -d
```

## v0.9.0

No hay variables obligatorias nuevas. Actualiza el backend **y** el ejecutor a la vez: el contrato gRPC ganó las llamadas de repositorios Git y la imagen del ejecutor ahora incluye `git`.

## v0.8.0

Añade una variable **obligatoria**; el backend no arranca sin ella.

1. Genera la clave y añádela a `.env`:

   ```bash
   echo "CREDENTIALS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
   ```

2. Haz copia de la clave.
3. Actualiza el compose (cambiaron volúmenes, puertos y healthchecks), y luego descarga y reinicia:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/compose.prod.yml -o compose.yml
   docker compose pull && docker compose up -d
   ```

4. Cifra las credenciales que se guardaron en claro antes de actualizar. Ejecútalo una vez; `--decrypt` lo revierte:

   ```bash
   docker compose exec backend bun dist/encrypt-credentials.mjs
   ```

Otros cambios de la v0.8: el ejecutor guarda su estado en el volumen `ansible_state` (desaparecen el montaje `./.data/ansible-runner:/app/playbook` y `ANSIBLE_PLAYBOOK_PATH`), ya no publica el puerto `8000`, y el backend ya no tiene servidor gRPC (se eliminaron `BACKEND_GRPC_TARGET` y el puerto `50052`).
