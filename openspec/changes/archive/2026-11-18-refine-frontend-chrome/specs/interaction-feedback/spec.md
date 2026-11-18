## ADDED Requirements

### Requirement: Iconos y tema de las notificaciones
Cada notificación (toast) SHALL mostrar un icono propio de su estado (éxito,
información, aviso, error o carga) con el vocabulario de iconos de la
aplicación, y SHALL seguir el tema activo (claro u oscuro) incluso cuando se
cambia con la notificación en pantalla.

#### Scenario: Icono por estado
- **WHEN** se muestra una notificación de éxito y otra de error
- **THEN** cada una SHALL mostrar el icono de su estado junto al mensaje

#### Scenario: Notificación de carga
- **WHEN** una acción larga muestra una notificación de carga
- **THEN** su icono SHALL girar mientras la acción esté en curso

#### Scenario: Cambio de tema con una notificación visible
- **WHEN** el usuario cambia entre tema claro y oscuro mientras hay una notificación en pantalla
- **THEN** la notificación SHALL adoptar los colores del nuevo tema sin recargar la página
