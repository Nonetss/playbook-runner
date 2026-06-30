## ADDED Requirements

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
