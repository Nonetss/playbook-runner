## 1. Shared presentation primitives

- [x] 1.1 Add presentation-only page shell, page hero, state-card, query-state, soft-card-list, status, search, filter, and row-action primitives under the shared frontend component structure.
- [x] 1.2 Evolve `ResourcePage`, `ResourceListState`, and resource form dialog chrome to compose the shared primitives while retaining their existing public APIs.

## 2. Feature adoption

- [x] 2.1 Migrate repeated resource-card overflow controls and card-list shells to the shared action and list primitives.
- [x] 2.2 Migrate history and resource list/detail loading, empty, and error states where the shared primitives fit without changing data hooks or execution-console behavior.

## 3. Navigation and locale support

- [x] 3.1 Extend the localized navigation metadata with stable icons, descriptions, priorities, and feature sub-links.
- [x] 3.2 Replace desktop and mobile navbar rendering with metadata-driven responsive navigation, including accessible overflow and nested links.
- [x] 3.3 Add all new navigation and shared-control copy to English and Spanish locale resources.

## 4. Interaction polish

- [x] 4.1 Replace broad global interactive transitions with scoped shared motion, scrollbar, touch-target, and reduced-motion utilities.
- [x] 4.2 Add the progressive-enhancement theme reveal while preserving immediate fallback behaviour and Astro page transitions.

## 5. Verification

- [x] 5.1 Run translation coverage, frontend type checking, and Biome; fix issues introduced by this change.
- [x] 5.2 Verify the OpenSpec change and record completion without modifying E2E test files or configuration.
