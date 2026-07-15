## Why

La lista plana de playbooks se vuelve difícil de recorrer a medida que crece. Los
usuarios necesitan agrupar playbooks relacionados sin alterar cómo se ejecutan o
cómo los referencian los jobs.

## What Changes

- Añadir carpetas de un único nivel para organizar playbooks.
- Permitir crear, renombrar y eliminar carpetas.
- Permitir asignar y mover playbooks entre una carpeta y la raíz.
- Permitir mover playbooks arrastrándolos sobre una carpeta.
- Añadir búsqueda y filtro por tipo en el listado.
- Mostrar carpetas y playbooks mediante navegación contextual en la sección de
  Playbooks.
- Al eliminar una carpeta, conservar sus playbooks moviéndolos a la raíz.
- Mantener la ejecución y los jobs basados en el identificador del playbook.

## Capabilities

### New Capabilities

- `playbook-management`: CRUD y organización de playbooks en carpetas planas.

### Modified Capabilities

Ninguna.

## Impact

- Nuevo esquema persistente para carpetas y una relación nullable desde
  `playbooks`.
- Nuevos procedimientos oRPC para carpetas y ampliación del contrato de
  playbooks con `folderId`.
- Nuevos componentes, hooks y traducciones en la sección frontend de Playbooks.
- Se requiere una migración de base de datos generada y aplicada por el
  mantenedor.
