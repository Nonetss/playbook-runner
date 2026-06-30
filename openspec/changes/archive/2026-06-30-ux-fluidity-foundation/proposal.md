## Why

Las primeras features (inventario, credenciales, playbooks) ya tienen endpoints conectados, pero la experiencia de uso es "poco operativa": las acciones no dan feedback de éxito, los errores y confirmaciones usan diálogos nativos (`window.alert` / `window.confirm`, 9 usos en 4 páginas), cada mutación espera el ida-y-vuelta completo antes de reflejarse, y cada página monta su propia caché de React Query, por lo que navegar entre secciones refetchea todo desde cero. El resultado es un flujo lento y con fricción justo cuando el producto empieza a usarse de verdad.

## What Changes

- **Sistema de feedback unificado**: se añade un `Toaster` global y notificaciones (toasts) de éxito/error en todas las mutaciones (crear, editar, borrar, gestionar relaciones) de las tres features.
- **Diálogo de confirmación propio**: se sustituyen todos los `window.confirm` / `window.alert` por un `ConfirmDialog` reusable, integrado en el design system, para las acciones destructivas.
- **Optimistic updates**: las mutaciones reflejan el cambio en la UI de inmediato y revierten ante error, mostrando un toast. Se centraliza en un helper de mutación compartido.
- **Capa de datos global**: un único `QueryClient` compartido por toda la app (en vez de un `QueryProvider` por página), con caché persistente entre secciones y prefetch al hacer hover en los enlaces de navegación.
- **Framework de recurso CRUD**: primitivas compartidas (`ResourcePage`, lista/card/estado vacío/estado de carga, modal de formulario por schema) para que inventario, credenciales y playbooks se comporten de forma idéntica y se reduzca el boilerplate duplicado.
- **BREAKING (interno)**: se elimina el patrón de `QueryProvider` por página y los `window.confirm/alert`; las features se migran a las nuevas primitivas. No cambia ningún contrato de API.

## Capabilities

### New Capabilities

- `interaction-feedback`: notificaciones (toasts) y diálogos de confirmación reusables como única vía de feedback al usuario para acciones y errores.
- `app-data-layer`: caché de datos global y compartida entre secciones, con optimistic updates y prefetch para una navegación fluida.
- `resource-crud-framework`: primitivas de UI compartidas para listar, crear, editar y borrar recursos de forma consistente en todas las features.

### Modified Capabilities
<!-- No existen specs previas en openspec/specs/; no hay capacidades existentes que modificar. -->

## Impact

- **Frontend**: `apps/frontend/src/components/features/{inventory,credentials,playbooks}` (páginas, listas, cards, form-modals, hooks), `layouts/Layout.astro`, `components/providers/query-provider.tsx`, `lib/query-client.ts`, y nuevos componentes compartidos en `components/ui` (`toast`/`sonner`, `confirm-dialog`) y `components/shared` (primitivas de recurso).
- **Dependencias**: se añade `sonner` (toasts) al frontend.
- **API / DB**: sin cambios. No se tocan routers, handlers ni schema.
- **Sin cambios de contrato**: los endpoints oRPC actuales se siguen consumiendo igual; solo cambia la capa de presentación e interacción.
