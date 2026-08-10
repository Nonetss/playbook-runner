## Why

Playbook Runner already has a clear visual identity, but its resource pages,
data states, card rows, and navigation duplicate UI decisions across features.
Adopting the mature shared patterns from the sibling stack will make the ops
console more coherent, responsive, and maintainable without importing
product-specific chat or agent functionality.

## What Changes

- Introduce shared page, state, list, action-menu, status, search, and filter
  primitives aligned with the existing quiet-editorial design system.
- Evolve resource pages and dialogs to use the new composable primitives while
  preserving their current feature behaviour, locale support, and Ansible
  execution console treatment.
- Make the application navigation metadata-driven, with localized labels,
  icons, responsive overflow, and nested links where a section owns related
  routes.
- Add restrained interface polish: scoped entry motion, stable and thin
  scrollbars, touch-friendly icon hit targets, and a reduced-motion-safe theme
  transition.
- Keep the existing E2E suite, authentication flow, database schema, API
  contracts, environment validation, and service topology unchanged.

## Capabilities

### New Capabilities

- `frontend-interface-polish`: Shared interaction and presentation behaviour
  for data states, lists, status markers, responsive controls, scrolling, and
  theme changes.

### Modified Capabilities

- `resource-crud-framework`: Resource features use the composable shared page,
  state, list, and form-dialog primitives.
- `web-navigation`: Navigation metadata supports localized labels, icons,
  nested links, and responsive overflow while retaining active-route behavior.

## Impact

- Affects `apps/frontend/src/components/shared`, `components/ui`,
  `features/app-shell`, resource feature components, `styles/global.css`, and
  the frontend layout.
- Adds small frontend-only shadcn primitives as needed; it does not add API,
  database, migration, Python service, or E2E-test work.
- Existing Spanish and English translation resources will be extended for all
  new user-facing copy.
