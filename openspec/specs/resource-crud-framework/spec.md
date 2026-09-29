# Resource CRUD Framework

## Purpose
TBD

## Requirements

### Requirement: Primitivas de página de recurso compartidas
El sistema SHALL ofrecer primitivas de UI compartidas y componibles para
presentar un recurso: marco de página, cabecera, acción de crear, filtros,
lista de entidades, estado de carga, estado vacío, estado de error y estado
vacío por filtros. Las colecciones de recursos SHALL presentarse como una
rejilla de tarjetas planas compartida (borde fino, sin sombra, sin pozo de
icono). Cada feature SHALL describir sus tarjetas mediante una definición
(principal, secundario, metadatos, estado, acción rápida y acciones) en lugar
de construir la tarjeta a mano. Todas las features SHALL reutilizarlas en lugar de
reimplementar el patrón, sin cambiar sus operaciones ni sus rutas.

#### Scenario: Estado de carga consistente
- **WHEN** una lista o detalle de recursos se está cargando
- **THEN** se muestra un indicador de carga compartido idéntico en todas las
  features

#### Scenario: Estado vacío consistente
- **WHEN** una lista de recursos no tiene elementos
- **THEN** se muestra un estado vacío compartido con una llamada a la acción de
  crear cuando la feature la permite

#### Scenario: Estado de error consistente
- **WHEN** la carga de una lista o detalle de recursos falla
- **THEN** se muestra un bloque de error compartido con la opción de reintentar

#### Scenario: Cabecera de recurso adaptable
- **WHEN** una feature presenta el título, descripción y acción de un recurso
- **THEN** usa la cabecera compartida
- **AND** la acción se adapta sin solaparse en pantallas estrechas

#### Scenario: Colección como tarjetas
- **WHEN** el usuario abre playbooks, scripts, dispositivos, grupos,
  credenciales, jobs, API keys o usuarios
- **THEN** los recursos se muestran como tarjetas de la rejilla compartida
- **AND** cada tarjeta muestra su nombre, un dato secundario, sus metadatos y
  un menú de acciones con la misma estructura en todas las features

### Requirement: Formularios de recurso por definición
El sistema SHALL permitir definir el formulario de crear/editar de un recurso
mediante una definición de campos compartida, de modo que el modal de
formulario, la validación básica y el estado de envío se comporten igual en
todas las features. Todo diálogo de crear, editar o gestionar un recurso
(incluidos credenciales, relaciones, ping, mover playbook, programación cron,
clave de API creada y script de aprovisionamiento) SHALL usar el marco de
diálogo compartido, con cabecera y pie con separadores coherentes, y mantener
la accesibilidad del diálogo base.

#### Scenario: Crear recurso
- **WHEN** el usuario abre el formulario de creación de cualquier recurso
- **THEN** el modal muestra los campos definidos, deshabilita el envío mientras
  está en curso y cierra al completarse con éxito

#### Scenario: Editar recurso
- **WHEN** el usuario abre el formulario de edición de un recurso existente
- **THEN** el formulario se precarga con los valores actuales del recurso
- **AND** al guardar se actualiza el recurso y se notifica el resultado

#### Scenario: Diálogos coherentes en una misma sección
- **WHEN** el usuario abre el diálogo de crear dispositivo y después el de
  crear credencial
- **THEN** ambos diálogos tienen la misma cabecera, espaciado y pie

### Requirement: Comportamiento CRUD uniforme entre features
El sistema SHALL garantizar que inventario, credenciales, playbooks, scripts,
jobs y configuración usen las mismas primitivas de recurso cuando comparten el
mismo patrón, de forma que las operaciones de crear, listar, editar y borrar
se comporten de manera idéntica. Inventario SHALL presentar dispositivos y
grupos como superficies CRUD independientes a nivel de ruta, sin pestañas que
oculten uno de los recursos.

#### Scenario: Paridad de comportamiento
- **WHEN** el usuario realiza la misma operación CRUD en features distintas
- **THEN** la interacción, el feedback y los estados (carga/vacío/error) son
  consistentes entre ellas

#### Scenario: Recursos de inventario separados
- **WHEN** el usuario abre Dispositivos o Grupos en inventario
- **THEN** ve una sola superficie de recurso con su acción de crear
- **AND** cambiar entre recursos se realiza mediante una ruta, no mediante una
  pestaña interna
