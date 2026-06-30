## 1. Fundación: providers, caché y toasts

- [ ] 1.1 Añadir `sonner` a `apps/frontend` (package.json) e instalar.
- [ ] 1.2 Ajustar `lib/query-client.ts` para devolver un QueryClient **singleton** en el navegador (misma instancia entre swaps de Astro), seguro en SSR.
- [ ] 1.3 Crear `components/providers/app-providers.tsx` que monte `QueryClientProvider` (con el singleton) + `<Toaster />` de sonner.
- [ ] 1.4 Montar `AppProviders` en `Layout.astro` con `client:load` y `transition:persist`, envolviendo el `<slot />`.
- [ ] 1.5 Crear `lib/toast.ts` con helpers `notifySuccess` / `notifyError` sobre sonner.

## 2. Primitivas de interacción

- [ ] 2.1 Crear `components/ui/sonner.tsx` (Toaster integrado con el theme/tokens actuales).
- [ ] 2.2 Crear `components/ui/confirm-dialog.tsx` sobre el `Dialog` existente (título, descripción, label confirmar, callback async, estado "ejecutando").
- [ ] 2.3 Crear `hooks/useConfirm.ts` para invocar el `ConfirmDialog` de forma imperativa.
- [ ] 2.4 Crear `hooks/useResourceMutation.ts`: encapsula `onMutate` (cancelar + snapshot + update optimista de lista), `onError` (rollback + `notifyError`), `onSuccess` (`notifySuccess`), `onSettled` (invalidate).

## 3. Primitivas de recurso CRUD

- [ ] 3.1 Crear `components/shared/resource-page.tsx` (cabecera + botón crear + slot de contenido).
- [ ] 3.2 Crear `components/shared/resource-list-state.tsx` (loading / error con reintento / vacío con CTA, uniforme).
- [ ] 3.3 Crear `components/shared/resource-form-modal.tsx` genérico que reciba una definición de campos y maneje estado, envío y errores.
- [ ] 3.4 Definir el tipo `FieldDefinition` y documentar el contrato de definición de formularios.

## 4. Migración piloto: Inventario

- [ ] 4.1 Reescribir `hooks/useDevices.ts` y `useGroups.ts` sobre `useResourceMutation` (optimistic + toasts).
- [ ] 4.2 Migrar `device-form-modal.tsx` y `group-form-modal.tsx` a `ResourceFormModal` con definición de campos.
- [ ] 4.3 Migrar `inventory-page.tsx` a `ResourcePage` + `ResourceListState`; eliminar el `QueryProvider` local.
- [ ] 4.4 Sustituir los `window.confirm`/`window.alert` de inventario (page y `relations-dialog.tsx`) por `ConfirmDialog` + toasts.
- [ ] 4.5 Verificar manualmente: crear/editar/borrar device y group muestran toast, optimistic y confirmación propia.

## 5. Migración: Credenciales y Playbooks

- [ ] 5.1 Migrar hooks `useCredentials` y `usePlaybooks` a `useResourceMutation`.
- [ ] 5.2 Migrar `credentials-page.tsx` y `playbooks-page.tsx` a `ResourcePage` + `ResourceListState`; eliminar sus `QueryProvider` locales.
- [ ] 5.3 Migrar `credential-form-modal.tsx` y `playbook-form-modal.tsx` a `ResourceFormModal`.
- [ ] 5.4 Sustituir los `window.confirm`/`window.alert` de credenciales y playbooks por `ConfirmDialog` + toasts.

## 6. Navegación fluida

- [ ] 6.1 Añadir prefetch al hover en `NavbarAuthenticated`: `prefetchQuery` de la lista principal de cada sección en `onMouseEnter`.
- [ ] 6.2 Verificar que al navegar entre secciones la caché persiste y no hay refetch/parpadeo completo.

## 7. Cierre y verificación

- [ ] 7.1 Búsqueda global: confirmar que no queda ningún `window.confirm`/`window.alert`/`window.prompt` ni `QueryProvider` montado por página.
- [ ] 7.2 Pasar lint/format (Biome) y typecheck del frontend.
- [ ] 7.3 Smoke test de las 3 features: CRUD completo con feedback, optimistic, confirmaciones y navegación fluida.
