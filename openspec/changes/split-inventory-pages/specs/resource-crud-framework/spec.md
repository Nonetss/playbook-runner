## MODIFIED Requirements

### Requirement: Comportamiento CRUD uniforme entre features
El sistema SHALL garantizar que inventario, credenciales y playbooks usen las
mismas primitivas de recurso, de forma que las operaciones de crear, listar,
editar y borrar se comporten de manera idéntica. Inventario SHALL presentar
dispositivos y grupos como superficies CRUD independientes a nivel de ruta,
sin pestañas que oculten uno de los recursos.

#### Scenario: Paridad de comportamiento
- **WHEN** el usuario realiza la misma operación CRUD en features distintas
- **THEN** la interacción, el feedback y los estados (carga/vacío/error) son
  consistentes entre ellas

#### Scenario: Recursos de inventario separados
- **WHEN** el usuario abre Dispositivos o Grupos en inventario
- **THEN** ve una sola superficie de recurso con su acción de crear
- **AND** cambiar entre recursos se realiza mediante una ruta, no mediante una
  pestaña interna
