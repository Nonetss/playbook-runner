## Context

Los playbooks se almacenan y presentan como una lista plana. La ejecución y los
jobs referencian playbooks por UUID, por lo que la organización puede añadirse
como metadato sin modificar esos flujos. El repositorio prohíbe a los agentes
generar o editar migraciones.

## Goals / Non-Goals

**Goals:**

- Organizar playbooks en carpetas de un nivel.
- Navegar entre la raíz y una carpeta mediante la URL.
- Crear, renombrar y borrar carpetas sin perder playbooks.
- Mover playbooks entre carpetas y la raíz.

**Non-Goals:**

- Subcarpetas, árboles o detección de ciclos.
- Cambios en ejecución, jobs o contenido YAML.
- Generación o aplicación automática de migraciones.

## Decisions

### Tabla propia y relación nullable

Se creará `playbook_folders` y `playbooks.folder_id` será una FK nullable con
`ON DELETE SET NULL`. `NULL` representa la raíz y permite que todos los
playbooks existentes sigan siendo válidos. Una columna de texto en playbooks se
descarta porque complicaría renombrados y no ofrecería integridad referencial.

### Carpetas planas

La tabla no tendrá `parentId`. Esto satisface la necesidad inmediata y evita la
complejidad de ciclos, profundidad y borrado recursivo.

### Router anidado y movimiento mediante update

El contrato expondrá `playbooks.folders.*`. Crear y actualizar playbooks
aceptará `folderId`; mover será una actualización parcial específica para evitar
reenviar contenido YAML desde el diálogo de movimiento.

### Navegación con query string

`/playbooks?folder=<uuid>` representa la carpeta activa. La raíz mantiene
`/playbooks`, no requiere nuevas páginas Astro y permite enlazar o recargar la
vista. Carpetas y playbooks se consultan en paralelo y se renderizan en el mismo
grid, con carpetas primero.

### Arrastre nativo con alternativa explícita

Las cards de playbook usan HTML Drag and Drop y las carpetas actúan como zonas
de destino. La acción “Mover a…” se mantiene para teclado, dispositivos táctiles
y como alternativa cuando el arrastre no esté disponible.

### Búsqueda y filtro locales

La vista filtra en memoria los recursos ya cargados por nombre, descripción y,
en playbooks, contenido. Un selector permite mostrar todo, solo carpetas o solo
playbooks sin añadir nuevas consultas al servidor.

### Nombres

No se añadirá una restricción de unicidad para conservar el comportamiento
actual de los playbooks y evitar diferencias entre `NULL` y UUID en índices.
La UI mostrará nombres tal como se almacenan.

## Risks / Trade-offs

- [Una URL referencia una carpeta eliminada] → La UI detectará que no aparece
  en el listado, notificará una vista no disponible y permitirá volver a raíz.
- [Una actualización usa un `folderId` inexistente] → El handler validará la
  carpeta y devolverá un error de petición.
- [Borrar una carpeta cambia muchos playbooks] → `ON DELETE SET NULL` lo
  resolverá atómicamente en PostgreSQL.
- [La app se despliega antes que la migración] → El mantenedor deberá generar y
  aplicar la migración antes de desplegar el código.

## Migration Plan

1. Generar una migración desde el esquema Drizzle actualizado.
2. Revisar que cree `playbook_folders` y añada `playbooks.folder_id` nullable.
3. Aplicar la migración; los playbooks existentes quedan en la raíz.
4. Desplegar API y frontend.

Para rollback, retirar primero el uso de carpetas en la aplicación y después
crear una migración inversa que elimine la FK y la tabla.

## Open Questions

Ninguna.
