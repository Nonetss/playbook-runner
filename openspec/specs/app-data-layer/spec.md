# App Data Layer

## Purpose
TBD

## Requirements

### Requirement: Caché de datos compartida entre secciones
El sistema SHALL usar un único cliente de datos (QueryClient) compartido por toda la aplicación, de modo que la caché persista al navegar entre secciones y no se refetcheen los datos ya cargados.

#### Scenario: Navegar entre secciones sin refetch
- **WHEN** el usuario navega de una sección a otra y vuelve dentro del tiempo de frescura de la caché
- **THEN** los datos ya cargados se muestran de inmediato desde la caché sin un nuevo estado de carga completo

#### Scenario: Proveedor único
- **WHEN** se renderiza cualquier página de la aplicación
- **THEN** todas comparten el mismo QueryClient en lugar de montar uno por página

### Requirement: Actualizaciones optimistas en mutaciones
El sistema SHALL aplicar la mutación de forma optimista en la UI antes de la confirmación del servidor, y SHALL revertir al estado anterior si la mutación falla.

#### Scenario: Cambio optimista con éxito
- **WHEN** el usuario crea, edita o borra un recurso
- **THEN** la UI refleja el cambio inmediatamente
- **AND** al confirmar el servidor la caché queda sincronizada con el estado real

#### Scenario: Reversión ante error
- **WHEN** una mutación optimista falla
- **THEN** la UI revierte al estado previo a la mutación
- **AND** se muestra un toast de error

### Requirement: Prefetch de navegación
El sistema SHALL prefetchear los datos de una sección cuando el usuario muestra intención de navegar a ella (p. ej. hover sobre el enlace), para que la sección aparezca ya cargada.

#### Scenario: Prefetch al hover
- **WHEN** el usuario hace hover sobre un enlace de navegación a una sección
- **THEN** el sistema inicia el prefetch de los datos principales de esa sección
- **AND** al abrir la sección los datos ya están disponibles o cargándose

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
