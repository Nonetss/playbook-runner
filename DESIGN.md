# Design System: Playbook Runner

## Direction

Playbook Runner is a calm, technical operations console. Interfaces favor a
clear task hierarchy and durable state over decorative dashboards: a page has
one primary action, operational data is scannable, and destructive actions are
unmistakable.

## Visual rules

- Use the neutral Tailwind/shadcn vocabulary already configured by the app;
  reserve the primary color for the main action and active state.
- Prefer structured lists, tables, and fact rows for inventories, playbooks,
  jobs, and run history. Do not turn each data item into an unrelated card.
- Use `font-mono tabular-nums` for hostnames, identifiers, ports, timestamps,
  durations, command content, and other technical values.
- Keep form labels explicit and pair errors with the field they describe.
- Use destructive styling only for irreversible actions and failed execution;
  do not encode ordinary status solely by color.

## Interaction rules

- Every asynchronous mutation communicates pending, success, and failure
  states through the existing query/mutation feedback patterns.
- Keyboard focus must remain visible, dialogs must return focus to their
  trigger, and icon-only controls need accessible names.
- Mobile layouts preserve the same actions and operational information as the
  desktop layout; navigation can collapse, capabilities cannot disappear.

## New-page checklist

1. Use the feature structure (`components/` and `hooks/`) and `@/` imports.
2. Define the empty, loading, success, and error states before styling the
   populated state.
3. Check desktop and mobile Playwright coverage when behavior changes.
4. Keep technical values copyable and visually distinct from prose.
