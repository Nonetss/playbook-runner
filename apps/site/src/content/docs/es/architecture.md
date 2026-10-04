---
title: Arquitectura
description: Cómo encajan el gateway, el frontend, el backend y el ejecutor de Ansible, y dónde viven tus secretos.
order: 5
---

Playbook Runner es un monorepo con tres servicios detrás de un gateway Caddy, más PostgreSQL. Solo el gateway publica un puerto, así que el navegador ve un único origen y el ejecutor que toca tus hosts nunca es accesible desde fuera.

| Servicio | Stack | Puerto | Función |
| --- | --- | --- | --- |
| Gateway | Caddy | `80` (publicado), `50050` (interno) | Entrada HTTP pública y router gRPC interno. |
| Frontend | Astro SSR, React | `4321` (interno) | La interfaz web. |
| Backend | Bun, Hono, oRPC, Better Auth, Drizzle | `3000` (interno) | Autenticación, la API, las reglas de negocio y el scheduler. Es el dueño de la base de datos. |
| Ejecutor | Python, FastAPI, gRPC, ansible-runner | `50051` (interno) | Ejecuta Ansible. No tiene base de datos. |
| PostgreSQL | PostgreSQL 17 | `5432` (interno) | Usuarios, inventario, credenciales, playbooks, jobs e historial. |

## Recorrido de las peticiones

El gateway envía `/rpc`, `/api`, `/scalar` y `/openapi.json` al backend y cualquier otra ruta al frontend.

El backend llega al ejecutor por gRPC a través del router interno del gateway en `:50050`, que enruta por paquete proto: `/run.*` va al ejecutor en `:50051` y cualquier otra cosa responde `UNIMPLEMENTED`.

## Anatomía de una ejecución

1. Pulsas **Ejecutar** en el navegador. El frontend llama al backend por oRPC y mantiene abierta la respuesta como un flujo de eventos.
2. El backend comprueba tu sesión y **resuelve la ejecución** contra su base de datos: el contenido del playbook (o, si viene de Git, el repositorio y el commit en el que se sincronizó), la lista de hosts sin duplicados y, para cada uno, su usuario SSH y su clave privada descifrada.
3. Envía ese paquete completo al ejecutor en una sola llamada gRPC con streaming desde el servidor, autenticada con el `SERVICE_TOKEN` compartido.
4. El ejecutor escribe un inventario y unos ficheros de clave temporales (y, para playbooks de Git, exporta el commit fijado desde su mirror), y se los pasa a `ansible-runner`.
5. Cada evento que emite Ansible vuelve por la misma llamada gRPC, y el backend lo reenvía al navegador. El backend registra la ejecución en el historial.
6. Cuando la ejecución termina, o cierras la pestaña y la llamada se cancela, el ejecutor detiene Ansible, mata los procesos que queden y borra los ficheros de clave de esa ejecución.

Los jobs programados siguen el mismo camino, lanzados por el bucle cron del backend en lugar de por un navegador.

## Modelo de seguridad

- **Las claves privadas nunca llegan al navegador.** Se cifran en reposo con AES-256-GCM usando `CREDENTIALS_ENCRYPTION_KEY`, la API nunca las devuelve y solo se descifran mientras el backend prepara una ejecución.
- **El ejecutor solo confía en el backend.** Cada llamada gRPC debe llevar `SERVICE_TOKEN`, y el ejecutor no se publica en ningún puerto del host.
- **Las claves de host se verifican** según `SSH_HOST_KEY_POLICY` (confianza en el primer uso, por defecto).
- **La entrada del usuario está acotada.** Las variables extra no pueden empezar por `ansible_` (el ejecutor lo vuelve a comprobar), y los nombres de dispositivos y grupos solo admiten letras, dígitos, `.`, `_` y `-`.
- **Las ejecuciones tienen límite.** Como mucho corren `MAX_CONCURRENT_RUNS` procesos de Ansible a la vez, las peticiones de más se rechazan con *too many requests*, un job nunca se solapa consigo mismo y `forks` tiene un máximo de 50.
- **Git está acotado.** Los repositorios solo se sincronizan por `https` y `ssh`, sin configuración global de Git, con un tiempo máximo por comando y un límite de tamaño. El `ansible.cfg` propio del repositorio se ignora.

## La API

La API está versionada bajo `/rpc/v1` (oRPC, la que usa el frontend) y `/api/v1` (OpenAPI). La referencia interactiva está en `/scalar` y la especificación en bruto en `/openapi.json`.

Desde scripts, autentícate con una API key personal, creada en la página **API keys** y enviada en la cabecera `x-api-key`:

```bash
curl -H "x-api-key: $PLAYBOOK_RUNNER_KEY" https://ansible.example.com/api/v1/playbooks/list
```
