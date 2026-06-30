## Context

El frontend es una app Astro (MPA) con islas React por feature. Cada página (`/inventory`, `/credentials`, `/playbooks`) renderiza una isla que monta su **propio** `QueryProvider` (`getQueryClient()` en `lib/query-client.ts`), por lo que la caché no se comparte entre páginas. Las mutaciones usan `@tanstack/react-query` con `invalidateQueries` en `onSuccess` (sin optimistic). El feedback al usuario es: éxito → nada; error → estado inline o `window.alert`; confirmación de borrado → `window.confirm`. Cada feature reimplementa el patrón page/list/card/form-modal/relations con pequeñas divergencias.

La navegación usa `astro:transitions` (`ClientRouter`, `transition:persist` en el navbar), así que el shell se mantiene, pero el contenido de cada isla se remonta y vuelve a hacer fetch.

Restricciones: no tocar API ni DB; mantener Astro como framework; el design system es Tailwind + componentes propios en `components/ui` (estilo shadcn). Las strings de UI están en español.

## Goals / Non-Goals

**Goals:**

- Feedback inmediato y consistente de toda acción (toasts de éxito/error) y confirmaciones propias (sin diálogos nativos).
- Sensación de instantaneidad: optimistic updates + caché compartida entre secciones + prefetch.
- Reducir boilerplate con primitivas CRUD compartidas reutilizadas por las tres features.
- Migración incremental, feature por feature, sin romper lo existente.

**Non-Goals:**

- No se cambia ningún contrato de API ni el schema de DB.
- No se migra a una SPA pura ni se abandona Astro.
- No se rediseña visualmente el producto; se mantiene el look actual.
- No se aborda búsqueda/filtrado, acciones en bloque ni command palette (futuras iteraciones).

## Decisions

### 1. Toasts con `sonner`, montado una sola vez

Se añade `sonner` y se monta un único `<Toaster />`. Como Astro remonta islas por página, el `Toaster` se incluye dentro del shell React compartido (ver decisión 2) para que viva una sola vez por sesión de navegación. API: `toast.success` / `toast.error` desde un helper común.

- **Alternativa descartada**: toast casero con contexto React → reinventar accesibilidad, colas y animaciones sin ganancia.

### 2. QueryClient global compartido vía shell React persistente

Se crea un componente raíz (`AppProviders`) que monta `QueryClientProvider` (con un QueryClient **singleton** de módulo, no por render) + `<Toaster />`, y se renderiza una vez en `Layout.astro` con `client:load` y `transition:persist`, envolviendo el contenido. Las islas de feature dejan de montar su propio `QueryProvider` y pasan a asumir que el provider ya existe.

- `lib/query-client.ts` se ajusta para devolver siempre la **misma** instancia en el navegador (singleton), de modo que la caché persista entre swaps de Astro.
- **Alternativa descartada**: un provider por página con `persistQueryClient` a `localStorage` → más complejidad y riesgo de datos obsoletos; el singleton en cliente basta porque el shell persiste.
- **Riesgo a verificar**: la interacción `transition:persist` + islas React. Si persistir el shell completo da problemas, fallback: QueryClient singleton de módulo compartido por todas las islas (la caché se comparte aunque el provider se remonte, porque la instancia es la misma).

### 3. Helper de mutación optimista compartido

Un hook `useResourceMutation` (o conjunto de factories en cada `useX` hook) que encapsula el patrón `onMutate` (cancelar queries, snapshot, update optimista de la lista en caché), `onError` (rollback + `toast.error`), `onSuccess` (`toast.success`) y `onSettled` (invalidate). Los hooks actuales (`useDevices`, `useGroups`, `useCredentials`, `usePlaybooks`) se reescriben sobre este helper.

- **Alternativa descartada**: optimistic ad-hoc en cada hook → duplicación y divergencia, justo lo que queremos evitar.

### 4. `ConfirmDialog` reusable

Componente sobre el `Dialog` existente que recibe título, descripción, label de confirmar y un callback async; gestiona el estado de "ejecutando". Sustituye los 9 usos de `window.confirm/alert`. Un hook `useConfirm()` opcional para invocarlo imperativamente.

### 5. Primitivas CRUD compartidas en `components/shared`

- `ResourcePage`: cabecera (título + descripción), botón de crear, y slots para lista/estados.
- `ResourceListState`: encapsula loading / error (con reintento) / vacío (con CTA) de forma uniforme.
- `ResourceFormModal`: modal genérico que toma una definición de campos (`{ name, label, placeholder, required, type }[]`), maneja estado, envío y errores, y delega en la mutación. Los form-modals actuales se reexpresan como definiciones de campos.
- Migración por capas: primero las primitivas, luego se migra **una** feature (inventario, la más completa) como referencia, después credenciales y playbooks.

### 6. Prefetch al hover en el navbar

En `NavbarAuthenticated`, cada nav link dispara `queryClient.prefetchQuery(...)` de la lista principal de su sección en `onMouseEnter`. Usa el QueryClient compartido de la decisión 2.

## Risks / Trade-offs

- **`transition:persist` + provider React persistente puede no comportarse como se espera** → Mitigación: la fuente de verdad de la caché es el QueryClient **singleton de módulo**; aunque el provider se remonte, la instancia y por tanto la caché se conservan. El `transition:persist` es una optimización adicional, no un requisito.
- **Optimistic updates pueden mostrar estados temporales incorrectos** (p. ej. orden, IDs generados en server) → Mitigación: usar IDs temporales/placeholder y reconciliar en `onSettled` con invalidate; mantener optimistic solo en operaciones simples (borrado y campos planos), no en relaciones N:M complejas en la primera iteración.
- **Refactor amplio que toca las 3 features a la vez** → Mitigación: migración incremental con inventario como piloto; las primitivas conviven con el código viejo hasta migrar cada feature.
- **`sonner` añade dependencia** → coste mínimo y estándar de facto; aceptable.
- **SSR de Astro**: el QueryClient singleton debe crearse solo en cliente (las islas usan `client:load`); evitar fugas de estado entre requests en server.

## Migration Plan

1. Añadir `sonner`; crear `AppProviders` (QueryClient singleton + Toaster) y montarlo en `Layout.astro`; ajustar `lib/query-client.ts` a singleton en cliente.
2. Crear `ConfirmDialog` + helper de toasts + `useResourceMutation`.
3. Crear primitivas `components/shared` (`ResourcePage`, `ResourceListState`, `ResourceFormModal`).
4. Migrar **inventario** (piloto): hooks a optimistic, page a primitivas, borrar `QueryProvider` local, sustituir `window.confirm/alert` por `ConfirmDialog`/toasts.
5. Migrar **credenciales** y **playbooks** al mismo patrón.
6. Añadir prefetch al hover en el navbar.
7. Verificar que no queda ningún `window.confirm/alert/prompt` ni `QueryProvider` por página.

**Rollback**: cada paso es independiente; revertir la migración de una feature no afecta a las demás (las primitivas son aditivas).

## Open Questions

- ¿Mantener optimistic también en las relaciones N:M (`RelationsDialog`) en esta iteración, o dejarlo en invalidate simple por ahora? (Propuesta: invalidate simple ahora.)
- ¿El estado vacío/loading debe incluir skeletons o basta con texto/spinner compartido en esta fase? (Propuesta: spinner/texto ahora, skeletons después.)
