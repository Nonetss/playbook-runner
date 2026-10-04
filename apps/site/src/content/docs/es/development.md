---
title: Desarrollo
description: Arranca el monorepo en local, ejecuta los tests y oriéntate por el código.
order: 8
---

Playbook Runner es un monorepo de Bun y Turborepo con un servicio en Python. Necesitas Bun 1.3, Docker y `uv` si vas a tocar el ejecutor.

## Arrancarlo en local

```bash
bun install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
bun run dev
```

En `apps/backend/.env` define como mínimo `BETTER_AUTH_SECRET` (`openssl rand -base64 48`), `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -base64 32`) y `SERVICE_TOKEN` (`openssl rand -base64 48`, el mismo valor en `apps/ansible/.env`), y apunta `DATABASE_URL` a un PostgreSQL. La forma más rápida:

```bash
docker run -d --name playbook-runner-pg \
  -e POSTGRES_DB=playbook_runner \
  -e POSTGRES_USER=playbook_runner \
  -e POSTGRES_PASSWORD=playbook_runner \
  -p 5432:5432 \
  postgres:17-alpine
```

`bun run dev` construye y arranca en Docker el frontend, el backend, el ejecutor y el gateway, cada uno con su propio servidor con recarga en caliente desde el código fuente. Los cambios se sincronizan con los contenedores; los cambios de dependencias y de `proto/` reconstruyen la imagen afectada. La app está en <http://localhost:4321> (el sitio del gateway, como en producción, en <http://localhost:8080>). Entra con `admin@playbook-runner.local` / `admin1234`. Borra los contenedores con `bun run dev:down`.

Para ejecutar las apps de forma nativa, usa `bun run dev:local` junto con `bun run gateway`. Usa una opción u otra: comparten puertos.

## Tests y comprobaciones

```bash
bun run test          # tests unitarios: bun test (API) y pytest (ejecutor)
bun run check-types   # TypeScript, astro check y BasedPyright
bun run check         # lint y formato con Biome
bun run test:e2e      # Playwright, necesita el backend en marcha
```

Los tests unitarios cubren la lógica pura sensible para la seguridad (cifrado de credenciales, generación de claves, validación de entradas, comprobación de URLs y rutas de Git, materialización de ejecuciones, el token de servicio) y no necesitan base de datos ni servicios en marcha. La CI ejecuta Biome, las comprobaciones de tipos y los tests unitarios en cada pull request.

## Estructura del repositorio

```text
apps/
  frontend/   Interfaz con Astro + React
  backend/    API Hono, oRPC, scheduler, autenticación
  ansible/    Ejecutor en Python sobre ansible-runner
  gateway/    Caddy: entrada pública y router gRPC
  site/       Esta web
packages/
  api/        Routers y handlers de oRPC, versionados en v1
  auth/       Configuración de Better Auth
  db/         Esquema y migraciones de Drizzle
  env/        Variables de entorno validadas
  grpc/       Utilidades de cliente gRPC y stubs generados
  logger/     Logging estructurado compartido
proto/        Contratos gRPC
playbooks/    Playbooks de ejemplo
```

## Esta web

La web vive en `apps/site` (Astro, salida estática) y la publica en GitHub Pages `.github/workflows/pages.yml` en cada push a `main` que la toque. Las páginas son ficheros Markdown en `apps/site/src/content/docs/<idioma>/`.

```bash
bun run --filter site dev
```

## Contribuir

Las incidencias y pull requests son bienvenidas en [GitHub](https://github.com/Nonetss/playbook-runner). El proyecto tiene licencia GNU GPL v3.0.
