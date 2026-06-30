## ADDED Requirements

### Requirement: Notificaciones de resultado de acción
El sistema SHALL mostrar una notificación (toast) no bloqueante tras cada mutación del usuario (crear, editar, borrar, gestionar relaciones), indicando éxito o error, sin interrumpir el flujo de trabajo.

#### Scenario: Acción completada con éxito
- **WHEN** una mutación (crear/editar/borrar/relacionar) se resuelve correctamente
- **THEN** el sistema muestra un toast de éxito con un mensaje descriptivo de la acción
- **AND** el toast se descarta automáticamente tras unos segundos sin requerir interacción

#### Scenario: Acción fallida
- **WHEN** una mutación falla (error de red o del servidor)
- **THEN** el sistema muestra un toast de error con un mensaje comprensible
- **AND** el estado de la UI no queda en un estado inconsistente

#### Scenario: Único punto de montaje
- **WHEN** la aplicación se carga en cualquier sección
- **THEN** existe exactamente un `Toaster` montado a nivel de aplicación que recibe todos los toasts

### Requirement: Confirmación de acciones destructivas
El sistema SHALL pedir confirmación mediante un diálogo propio del design system antes de ejecutar una acción destructiva (borrar), y SHALL NOT usar diálogos nativos del navegador (`window.confirm`, `window.alert`, `window.prompt`).

#### Scenario: Confirmar borrado
- **WHEN** el usuario solicita borrar un recurso
- **THEN** el sistema abre un `ConfirmDialog` con el nombre del recurso y un mensaje de advertencia
- **AND** la mutación de borrado solo se ejecuta si el usuario confirma

#### Scenario: Cancelar borrado
- **WHEN** el usuario cancela o cierra el diálogo de confirmación
- **THEN** no se ejecuta ninguna mutación y el recurso permanece intacto

#### Scenario: Sin diálogos nativos
- **WHEN** se ejecuta cualquier acción que antes usaba `window.confirm`/`window.alert`
- **THEN** la confirmación y los errores se comunican mediante `ConfirmDialog` y toasts, no mediante diálogos nativos del navegador
