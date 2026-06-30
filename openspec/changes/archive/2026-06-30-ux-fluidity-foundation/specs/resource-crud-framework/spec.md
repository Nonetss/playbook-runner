## ADDED Requirements

### Requirement: Primitivas de página de recurso compartidas

El sistema SHALL ofrecer primitivas de UI compartidas para presentar un recurso (cabecera, acción de crear, lista, estado de carga y estado vacío), de modo que todas las features las reutilicen en lugar de reimplementar el patrón.

#### Scenario: Estado de carga consistente

- **WHEN** una lista de recursos se está cargando
- **THEN** se muestra un indicador de carga compartido idéntico en todas las features

#### Scenario: Estado vacío consistente

- **WHEN** una lista de recursos no tiene elementos
- **THEN** se muestra un estado vacío compartido con una llamada a la acción de crear

#### Scenario: Estado de error consistente

- **WHEN** la carga de una lista de recursos falla
- **THEN** se muestra un bloque de error compartido con la opción de reintentar

### Requirement: Formularios de recurso por definición

El sistema SHALL permitir definir el formulario de crear/editar de un recurso mediante una definición de campos compartida, de modo que el modal de formulario, la validación básica y el estado de envío se comporten igual en todas las features.

#### Scenario: Crear recurso

- **WHEN** el usuario abre el formulario de creación de cualquier recurso
- **THEN** el modal muestra los campos definidos, deshabilita el envío mientras está en curso y cierra al completarse con éxito

#### Scenario: Editar recurso

- **WHEN** el usuario abre el formulario de edición de un recurso existente
- **THEN** el formulario se precarga con los valores actuales del recurso
- **AND** al guardar se actualiza el recurso y se notifica el resultado

### Requirement: Comportamiento CRUD uniforme entre features

El sistema SHALL garantizar que inventario, credenciales y playbooks usen las mismas primitivas de recurso, de forma que las operaciones de crear, listar, editar y borrar se comporten de manera idéntica.

#### Scenario: Paridad de comportamiento

- **WHEN** el usuario realiza la misma operación CRUD en features distintas
- **THEN** la interacción, el feedback y los estados (carga/vacío/error) son consistentes entre ellas
