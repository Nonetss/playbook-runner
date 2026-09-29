import type { CSSProperties, ReactNode } from "react"
import { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { SoftCardList } from "@/components/shared/data-display/soft-card-list"
import {
  StatusDot,
  type StatusDotTone,
  StatusTag,
} from "@/components/shared/data-display/status-dot"
import { AppLink } from "@/components/ui/app-link"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { LucideIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

export interface EntityListStatus {
  tone: StatusDotTone
  label: ReactNode
  title?: string
  pulse?: boolean
}

export interface EntityListMetadataDescriptor<TItem, TContext> {
  key: string
  /** Static label, or resolved from context (e.g. a translation). */
  label: string | ((context: TContext) => string)
  value: (item: TItem, context: TContext) => ReactNode
  hidden?: (item: TItem, context: TContext) => boolean
}

export interface EntityListActionDescriptor<TItem, TContext> {
  key: string
  label: string | ((item: TItem, context: TContext) => string)
  icon?: LucideIcon
  destructive?: boolean
  disabled?: (item: TItem, context: TContext) => boolean
  hidden?: (item: TItem, context: TContext) => boolean
  onSelect: (item: TItem, context: TContext) => void
}

/**
 * Row contract for a resource collection. One definition per resource
 * (`features/<name>/definitions/*.definition.tsx`); pages pass `context`
 * for labels, lookups and callbacks instead of closing over page state.
 */
export interface EntityListDefinition<TItem, TContext = void> {
  getKey: (item: TItem) => string
  getAccessibleLabel?: (item: TItem, context: TContext) => string
  getPrimary: (item: TItem, context: TContext) => ReactNode
  getSecondary?: (item: TItem, context: TContext) => ReactNode
  getStatus?: (item: TItem, context: TContext) => EntityListStatus | null
  isMuted?: (item: TItem, context: TContext) => boolean
  onOpen?: (item: TItem, context: TContext) => void
  getOpenHref?: (item: TItem, context: TContext) => string
  metadata?: EntityListMetadataDescriptor<TItem, TContext>[]
  /** A narrow leaf rendered before the status tag (e.g. a quick action). */
  renderTrailing?: (item: TItem, context: TContext) => ReactNode
  actions?: EntityListActionDescriptor<TItem, TContext>[]
}

const metadataColumnsClass = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
} as const

const MAX_STAGGER_INDEX = 12

function EntityActions<TItem, TContext>({
  item,
  context,
  actions,
  accessibleLabel,
}: {
  item: TItem
  context: TContext
  actions: EntityListActionDescriptor<TItem, TContext>[]
  accessibleLabel?: string
}) {
  const { t } = useTranslation("common")
  if (actions.length === 0) return null

  return (
    <RowActionsMenu
      label={
        accessibleLabel
          ? t("labels.row_actions_for", { name: accessibleLabel })
          : undefined
      }
    >
      {actions.map((action, actionIndex) => {
        const Icon = action.icon
        const label =
          typeof action.label === "function"
            ? action.label(item, context)
            : action.label
        const needsSeparator =
          action.destructive &&
          actionIndex > 0 &&
          !actions[actionIndex - 1]?.destructive

        return (
          <Fragment key={action.key}>
            {needsSeparator ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              variant={action.destructive ? "destructive" : undefined}
              disabled={action.disabled?.(item, context)}
              onClick={() => action.onSelect(item, context)}
            >
              {Icon ? <Icon className="size-4" /> : null}
              {label}
            </DropdownMenuItem>
          </Fragment>
        )
      })}
    </RowActionsMenu>
  )
}

function resolveRow<TItem, TContext>(
  item: TItem,
  context: TContext,
  definition: EntityListDefinition<TItem, TContext>
) {
  const primary = definition.getPrimary(item, context)
  return {
    muted: definition.isMuted?.(item, context) ?? false,
    status: definition.getStatus?.(item, context) ?? null,
    primary,
    secondary: definition.getSecondary?.(item, context),
    metadata: (definition.metadata ?? []).filter(
      (field) => !field.hidden?.(item, context)
    ),
    actions: (definition.actions ?? []).filter(
      (action) => !action.hidden?.(item, context)
    ),
    trailing: definition.renderTrailing?.(item, context),
    accessibleLabel:
      definition.getAccessibleLabel?.(item, context) ??
      (typeof primary === "string" ? primary : undefined),
  }
}

function metadataLabel<TItem, TContext>(
  field: EntityListMetadataDescriptor<TItem, TContext>,
  context: TContext
) {
  return typeof field.label === "function" ? field.label(context) : field.label
}

function EntityListRow<TItem, TContext>({
  item,
  index,
  context,
  definition,
}: {
  item: TItem
  index: number
  context: TContext
  definition: EntityListDefinition<TItem, TContext>
}) {
  const {
    muted,
    status,
    primary,
    secondary,
    metadata,
    actions,
    trailing,
    accessibleLabel,
  } = resolveRow(item, context, definition)
  const columns = Math.min(
    4,
    Math.max(1, metadata.length)
  ) as keyof typeof metadataColumnsClass

  const primaryBlock = (
    <div className="flex min-w-0 items-start gap-3">
      {status ? (
        <StatusDot
          tone={status.tone}
          pulse={status.pulse}
          className="mt-2 shrink-0"
        />
      ) : null}
      <div className="min-w-0">
        <Text as="p" variant="headline" className="truncate">
          {primary}
        </Text>
        {secondary ? (
          <Text
            as="div"
            variant="meta"
            tone="muted"
            className="mt-0.5 truncate"
          >
            {secondary}
          </Text>
        ) : null}
      </div>
    </div>
  )

  return (
    <li
      className={cn(
        "group dash-enter grid gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_auto] sm:items-center sm:gap-6 sm:px-5",
        muted && "opacity-60"
      )}
      style={
        {
          "--dash-delay": `${Math.min(index, MAX_STAGGER_INDEX) * 40}ms`,
        } as CSSProperties
      }
    >
      {definition.getOpenHref ? (
        <AppLink
          href={definition.getOpenHref(item, context)}
          aria-label={accessibleLabel}
          className="min-w-0 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {primaryBlock}
        </AppLink>
      ) : definition.onOpen ? (
        <button
          type="button"
          onClick={() => definition.onOpen?.(item, context)}
          aria-label={accessibleLabel}
          className="min-w-0 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {primaryBlock}
        </button>
      ) : (
        primaryBlock
      )}

      <div
        className={cn("grid gap-x-5 gap-y-3", metadataColumnsClass[columns])}
      >
        {metadata.map((field) => (
          <MetadataCell key={field.key} label={metadataLabel(field, context)}>
            {field.value(item, context)}
          </MetadataCell>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {trailing || status ? (
          <div className="flex items-center gap-3">
            {trailing}
            {status ? (
              <StatusTag title={status.title}>{status.label}</StatusTag>
            ) : null}
          </div>
        ) : null}
        <EntityActions
          item={item}
          context={context}
          actions={actions}
          accessibleLabel={accessibleLabel}
        />
      </div>
    </li>
  )
}

/**
 * Descriptor-driven resource list: one `rounded-xl border bg-card/40
 * divide-y` container, one row per item. The definition supplies leaf
 * values; this component owns the markup, layout and entrance motion.
 */
export function EntityList<TItem, TContext = void>({
  items,
  context,
  definition,
  className,
}: {
  items: readonly TItem[]
  context: TContext
  definition: EntityListDefinition<TItem, TContext>
  className?: string
}) {
  return (
    <SoftCardList as="ul" className={className}>
      {items.map((item, index) => (
        <EntityListRow
          key={definition.getKey(item)}
          item={item}
          index={index}
          context={context}
          definition={definition}
        />
      ))}
    </SoftCardList>
  )
}

function EntityCard<TItem, TContext>({
  item,
  index,
  context,
  definition,
}: {
  item: TItem
  index: number
  context: TContext
  definition: EntityListDefinition<TItem, TContext>
}) {
  const {
    muted,
    status,
    primary,
    secondary,
    metadata,
    actions,
    trailing,
    accessibleLabel,
  } = resolveRow(item, context, definition)
  const openHref = definition.getOpenHref?.(item, context)

  return (
    <li
      className={cn(
        "group dash-enter relative flex min-w-0 flex-col rounded-xl border bg-card/40 p-5",
        "transition-colors duration-200 hover:border-foreground/15 hover:bg-muted/40 has-focus-visible:border-foreground/15",
        muted && "opacity-60"
      )}
      style={
        {
          "--dash-delay": `${Math.min(index, MAX_STAGGER_INDEX) * 40}ms`,
        } as CSSProperties
      }
    >
      {openHref ? (
        <AppLink
          href={openHref}
          aria-label={accessibleLabel}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : definition.onOpen ? (
        <button
          type="button"
          onClick={() => definition.onOpen?.(item, context)}
          aria-label={accessibleLabel}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : null}

      <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {status ? (
            <StatusDot
              tone={status.tone}
              pulse={status.pulse}
              className="mt-2 shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <Text as="p" variant="headline" className="truncate">
              {primary}
            </Text>
            {secondary ? (
              <Text
                as="div"
                variant="meta"
                tone="muted"
                className="mt-0.5 line-clamp-2"
              >
                {secondary}
              </Text>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-auto -mt-1.5 -mr-2 shrink-0">
          <EntityActions
            item={item}
            context={context}
            actions={actions}
            accessibleLabel={accessibleLabel}
          />
        </div>
      </div>

      {metadata.length > 0 ? (
        <div className="pointer-events-none relative z-10 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          {metadata.map((field) => (
            <MetadataCell key={field.key} label={metadataLabel(field, context)}>
              {field.value(item, context)}
            </MetadataCell>
          ))}
        </div>
      ) : null}

      {status || trailing ? (
        <div className="pointer-events-none relative z-10 mt-auto flex items-center justify-between gap-3 pt-4 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_[role=switch]]:pointer-events-auto [&_[role=combobox]]:pointer-events-auto">
          {status ? (
            <StatusTag title={status.title}>{status.label}</StatusTag>
          ) : (
            <span />
          )}
          {trailing}
        </div>
      ) : null}
    </li>
  )
}

/**
 * Card-grid sibling of `EntityList`: the same `EntityListDefinition`
 * rendered as a responsive grid of flat `rounded-xl border bg-card/40`
 * cards (name, description, action menu, fact rows, status + quick action).
 * This is the default presentation for resource collections.
 */
export function EntityCardGrid<TItem, TContext = void>({
  items,
  context,
  definition,
  className,
}: {
  items: readonly TItem[]
  context: TContext
  definition: EntityListDefinition<TItem, TContext>
  className?: string
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {items.map((item, index) => (
        <EntityCard
          key={definition.getKey(item)}
          item={item}
          index={index}
          context={context}
          definition={definition}
        />
      ))}
    </ul>
  )
}
