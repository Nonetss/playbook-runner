# AGENTS.md

Esta carpeta (`docs/` de `playbook-runner`) es la raíz de un repositorio de contenido de la plataforma colofon: páginas (MDX) en `docs/docs/`, menú, catálogo, diagramas, skills servidas y configuración. La plataforma lo clona, lo valida y lo publica; aquí no se compila ni se ejecuta nada.

Antes de escribir o cambiar nada, carga la skill `colofon-documentation` y la de la carpeta que vayas a tocar (`colofon-docs` para `docs/`, `colofon-catalog` para `catalog/`, `colofon-diagrams` para `diagrams/`, `colofon-skills` para `skills/`). Las skills `colofon-*` son de la plataforma y se instalan para todo el usuario: nunca se copian aquí.

## Este sitio

- **Qué documenta:** Playbook Runner por dentro y cómo escribir lo que ejecuta. Es para quien trabaja en el código o escribe playbooks. Las guías de instalación y uso son la web pública (`apps/site`), y aquí solo se enlazan.
- **Secciones** (carpetas de `docs/docs/`): `fundamentos`, `ejecucion` (lo que el runner le hace a un playbook), `guias` (recetas de escritura), `plataforma` y `operacion`, más la página suelta `estado`. La portada es `docs/index.mdx`. El menú está en `menu.yaml`.
- **Catálogo:** `services` (id: nombre corto), `workspaces` (id: la ruta con guiones), `features-api` (id: carpeta de la feature), `tablas` (id: nombre SQL con guiones), `reglas` (id: la regla en pocas palabras, con `source` el código que la impone y `checked` si se probó o solo se leyó) y `problemas` (id: el problema; una entidad corregida se borra).
- **Referencias al código:** colofon solo enlaza páginas e imágenes, así que un fichero del monorepo se cita como ruta desde su raíz, entre backticks y sin enlace. Nunca se inventa una ruta: se comprueba.
- **Diagramas:** `arquitectura` (portada y panorama) cambia si cambia un servicio o una conexión; `ejecucion-secuencia` (panorama) si cambia el recorrido de una ejecución.
- **Skills servidas:** `write-playbook`, `write-role` y `write-script`. Se publican con el slug del repositorio delante (`playbook-runner-write-playbook`) y citan rutas `/playbook-runner/…`: si el repositorio se registra con otro slug, hay que actualizarlas.
- **`probado` es una afirmación fuerte:** una regla solo lleva `checked: probado` si se ejecutó de verdad (receta en `docs/guias/probar-un-playbook.mdx`).
- **Estado:** `docs/estado.mdx` es una foto con fecha; lo que deje de ser cierto se actualiza o se borra.
- **Mantener al día:** si cambia en el código algo que una página, una regla o una skill afirma, se actualizan en el mismo cambio, junto con su `updated`. Los cambios en cómo el runner trata un playbook tocan siempre `reglas`, `ejecucion` y las skills.
- **Biome:** `biome ci .` de la raíz del monorepo también revisa los `.json` de `diagrams/`; hay que dejarlos formateados.
