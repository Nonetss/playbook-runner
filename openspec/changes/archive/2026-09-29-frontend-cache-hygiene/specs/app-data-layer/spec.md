## ADDED Requirements

### Requirement: Caché aislada por sesión
El sistema SHALL vaciar por completo la caché de datos compartida (QueryClient) cuando cambia la identidad autenticada, es decir al cerrar sesión y al completar un inicio de sesión, de modo que ningún dato cacheado sobreviva a la sesión que lo obtuvo.

#### Scenario: Cerrar sesión vacía la caché
- **WHEN** el usuario A cierra sesión desde el menú de cuenta
- **THEN** todas las queries cacheadas se eliminan antes de redirigir a `/login`

#### Scenario: Otro usuario inicia sesión en la misma pestaña
- **WHEN** el usuario B inicia sesión en la misma pestaña dentro del tiempo de frescura de la caché del usuario A
- **THEN** ninguna sección muestra datos cacheados del usuario A
- **AND** los datos de cada sección se obtienen de nuevo con la sesión de B

### Requirement: Sincronización de consultas de detalle tras mutaciones
El sistema SHALL invalidar la consulta de detalle (`get`) del recurso afectado tras cada mutación de edición, y SHALL eliminarla de la caché tras un borrado, para todos los recursos con vista o formulario de detalle (scripts, playbooks, carpetas de playbooks, grupos, dispositivos, credenciales y jobs). Este comportamiento SHALL estar centralizado en la primitiva de mutación compartida y no depender de envoltorios por recurso.

#### Scenario: Editar y volver a abrir el formulario
- **WHEN** el usuario guarda cambios en un script y vuelve a abrir su formulario de edición dentro del tiempo de frescura de la caché
- **THEN** el formulario muestra los valores recién guardados, no los anteriores

#### Scenario: Detalle de grupo tras renombrar
- **WHEN** el usuario renombra un grupo y abre su página de detalle
- **THEN** la página muestra el nombre nuevo

#### Scenario: Detalle tras borrar
- **WHEN** el usuario borra un recurso
- **THEN** la consulta de detalle de ese id deja de estar en caché y no se muestra si se navega de nuevo a su URL
