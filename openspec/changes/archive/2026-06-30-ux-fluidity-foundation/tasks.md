## 1. Fundación: providers, caché y toasts

- [x] 1.1 Añadir `sonner` a `apps/frontend` (package.json) e instalar.
- [x] 1.2 Ajustar `lib/query-client.ts` para devolver un QueryClient **singleton** en el navegador (misma instancia entre swaps de Astro), seguro en SSR.
- [x] 1.3 Crear `components/providers/app-providers.tsx` que monte `QueryClientProvider` (con el singleton) + `<Toaster />` de sonner.
- [x] 1.4 Montar `AppProviders` en `Layout.astro` con `client:load` y `transition:persist`, envolviendo el `<slot />`.
- [x] 1.5 Crear `lib/toast.ts` con helpers `notifySuccess` / `notifyError` sobre sonner.

## 2. Primitivas de interacción

- [x] 2.1 Crear `components/ui/sonner.tsx` (Toaster integrado con el theme/tokens actuales).
- [x] 2.2 Crear `components/ui/confirm-dialog.tsx` sobre el `Dialog` existente (título, descripción, label confirmar, callback async, estado "ejecutando").
- [x] 2.3 Crear `hooks/useConfirm.ts` para invocar el `ConfirmDialog` de forma imperativa.
- [x] 2.4 Crear `hooks/useResourceMutation.ts`: encapsula `onMutate` (cancelar + snapshot + update optimista de lista), `onError` (rollback + `notifyError`), `onSuccess` (`notifySuccess`), `onSettled` (invalidate).

## 3. Primitivas de recurso CRUD

- [x] 3.1 Crear `components/shared/resource-page.tsx` (cabecera + botón crear + slot de contenido).
- [x] 3.2 Crear `components/shared/resource-list-state.tsx` (loading / error con reintento / vacío con CTA, uniforme).
- [x] 3.3 Crear `components/shared/resource-form-modal.tsx` genérico que reciba una definición de campos y maneje estado, envío y errores.
- [x] 3.4 Definir el tipo `FieldDefinition` y documentar el contrato de definición de formularios.

## 4. Migración piloto: Inventario

- [x] 4.1 Reescribir `hooks/useDevices.ts` y `useGroups.ts` sobre `useResourceMutation` (optimistic + toasts).
- [x] 4.2 Migrar `device-form-modal.tsx` y `group-form-modal.tsx` a `ResourceFormModal` con definición de campos.
- [x] 4.3 Migrar `inventory-page.tsx` a `ResourcePage` + `ResourceListState`; eliminar el `QueryProvider` local.
- [x] 4.4 Sustituir los `window.confirm`/`window.alert` de inventario (page y `relations-dialog.tsx`) por `ConfirmDialog` + toasts.
- [x] 4.5 Verificar manualmente: crear/editar/borrar device y group muestran toast, optimistic y confirmación propia.

## 5. Migración: Credenciales y Playbooks

- [x] 5.1 Migrar hooks `useCredentials` y `usePlaybooks` a `useResourceMutation`.
- [x] 5.2 Migrar `credentials-page.tsx` y `playbooks-page.tsx` a `ResourcePage` + `ResourceListState`; eliminar sus `QueryProvider` locales.
- [x] 5.3 Migrar `credential-form-modal.tsx` y `playbook-form-modal.tsx` a `ResourceFormModal`.
- [x] 5.4 Sustituir los `window.confirm`/`window.alert` de credenciales y playbooks por `ConfirmDialog` + toasts.

## 6. Navegación fluida

- [x] 6.1 Añadir prefetch al hover en `NavbarAuthenticated`: `prefetchQuery` de la lista principal de cada sección en `onMouseEnter`.
- [x] 6.2 Verificar que al navegar entre secciones la caché persiste y no hay refetch/parpadeo completo.

## 7. Cierre y verificación

- [x] 7.1 Búsqueda global: confirmar que no queda ningún `window.confirm`/`window.alert`/`window.prompt` ni `QueryProvider` montado por página.
- [x] 7.2 Pasar lint/format (Biome) y typecheck del frontend.
- [x] 7.3 Smoke test de las 3 features: CRUD completo con feedback, optimistic, confirmaciones y navegación fluida.
