---
title: Primeros pasos
description: Instala Playbook Runner en un servidor Linux con un solo comando e inicia sesión por primera vez.
order: 1
---

Playbook Runner es una interfaz web autoalojada para Ansible. Guarda tu inventario, credenciales SSH, playbooks y programaciones en PostgreSQL, y muestra cada ejecución en el navegador mientras ocurre. Se distribuye como cuatro imágenes Docker (gateway, frontend, backend y el ejecutor de Ansible) más PostgreSQL.

## Requisitos

- Un host Linux, `amd64` o `arm64`.
- Docker con el plugin de Compose (`docker compose`).
- `curl` y `openssl`, que el instalador usa para descargar ficheros y generar secretos.
- Acceso SSH desde ese host a las máquinas que quieras gestionar.

## Instalar con un solo comando

Crea un directorio vacío para el despliegue, entra en él y ejecuta:

```bash
curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/main/scripts/bootstrap.sh | bash
```

El script es interactivo aunque llegue por una tubería, porque lee las respuestas desde la terminal. Pregunta:

1. La **URL pública** que usará el navegador (por ejemplo `https://ansible.example.com`) y el **puerto** que se publica en el host (por defecto `4321`).
2. El **primer administrador**: nombre, email y una contraseña de al menos 8 caracteres.
3. Opcionalmente, un **proveedor OIDC** para el inicio de sesión único (client id, secret e issuer).

Después genera todos los secretos con `openssl`, escribe `.env` (modo `600`) y `compose.yml` en el directorio actual, descarga las imágenes de `ghcr.io` y arranca el stack. Si defines `PB_REF` en el lado de `bash` (`… | PB_REF=v0.10.2 bash`) eliges qué versión de `compose.yml` descarga (por defecto `main`); la versión de las imágenes la marcan las variables `*_IMAGE_TAG` de `.env`, `latest` por defecto.

> **Haz copia de `.env`**, sobre todo de `CREDENTIALS_ENCRYPTION_KEY`. Cifra las claves privadas SSH guardadas en la base de datos; si la pierdes, no se pueden recuperar.

## Iniciar sesión

El backend aplica las migraciones de la base de datos y crea el administrador definido en `.env` al arrancar, así que no hay ningún paso de configuración aparte. Tras uno o dos minutos, abre la URL pública e inicia sesión con el email y la contraseña que elegiste.

No hay registro público. El resto de cuentas las crea un administrador en la página **Usuarios** (`/admin/users`), o se dan de alta en el primer inicio de sesión por SSO. Consulta [Usuarios e inicio de sesión](./authentication/).

## Siguientes pasos

- [Tu primera ejecución](./first-run/): añade una credencial y un dispositivo, y ejecuta un playbook.
- [Desplegar con Docker Compose](./deploy/): la misma instalación a mano, detrás de HTTPS o con una base de datos externa.
- [Configuración](./configuration/): todas las variables de entorno.
