import * as React from "react"
import { useTranslation } from "react-i18next"
import { dataFieldClass } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import type {
  FieldDefinition,
  ResourceFormDefinition,
} from "@/components/shared/resource-form-types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useOnOpen } from "@/hooks/use-on-open"
import { cn } from "@/lib/utils"

/** Radix Select no admite `value=""`; usamos un valor centinela para "sin selección". */
const SELECT_EMPTY_VALUE = "__none__"

export interface ResourceFormModalProps<
  TValues extends Record<string, unknown>,
> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  isEditing: boolean
  definition: ResourceFormDefinition<TValues>
  /** The current entity being edited (null when creating). */
  entity?: unknown
  /** Called with the values on submit. Toasts / rollback handled by caller. */
  onSubmit: (values: TValues) => Promise<void>
  /** External submitting state (e.g. the mutation's `isPending`). */
  isSubmitting?: boolean
  submitLabel?: string
  editingSubmitLabel?: string
  submitErrorMessage?: string
  /** Optional id used to seed textarea / input elements for a11y tests. */
  formId?: string
}

/**
 * Generic form modal driven by a `ResourceFormDefinition`. Manages local form
 * state, syncs with the entity being edited, disables the form while
 * submitting, and delegates the mutation to the caller.
 *
 * Toasts (success / error) and optimistic logic live in the caller via the
 * shared `useResourceMutation` hook.
 */
export function ResourceFormModal<TValues extends Record<string, unknown>>({
  open,
  onOpenChange,
  title,
  description,
  isEditing,
  definition,
  entity,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  editingSubmitLabel,
  submitErrorMessage,
  formId = "resource-form",
}: ResourceFormModalProps<TValues>) {
  const { t } = useTranslation("common")
  const [values, setValues] = React.useState<TValues>(definition.defaultValues)
  const [error, setError] = React.useState<string | null>(null)

  useOnOpen(open, () => {
    setValues(
      entity ? definition.valuesFromEntity(entity) : definition.defaultValues
    )
    setError(null)
  })

  function updateField<K extends keyof TValues>(key: K, value: TValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setError(
        submitErrorMessage ??
          (err instanceof Error ? err.message : t("labels.error_saving"))
      )
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      onSubmit={handleSubmit}
      isPending={isSubmitting}
      submitLabel={
        isSubmitting
          ? t("actions.saving")
          : isEditing
            ? (editingSubmitLabel ?? t("actions.save_changes"))
            : (submitLabel ?? t("actions.create"))
      }
      cancelLabel={t("actions.cancel")}
      formId={formId}
    >
      {definition.fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          value={values[field.name]}
          disabled={isSubmitting}
          onChange={(value) =>
            updateField(
              field.name as keyof TValues,
              value as TValues[keyof TValues]
            )
          }
        />
      ))}
      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}

function FieldRow({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDefinition
  value: unknown
  disabled: boolean
  onChange: (value: string) => void
}) {
  const id = `${field.name}-field`
  const stringValue =
    typeof value === "string" ? value : value == null ? "" : String(value)

  return (
    <FormField label={field.label} htmlFor={id} required={field.required}>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          required={field.required}
          disabled={disabled}
          placeholder={field.placeholder}
          value={stringValue}
          rows={field.rows ?? 5}
          onChange={(e) => onChange(e.target.value)}
          className={cn(dataFieldClass, field.inputClassName)}
        />
      ) : field.type === "select" ? (
        <Select
          value={stringValue || SELECT_EMPTY_VALUE}
          onValueChange={(next) => {
            // Radix emits "" while async options have not loaded yet; the
            // empty choice is the sentinel, so "" is never a user choice.
            if (next === "") return
            onChange(next === SELECT_EMPTY_VALUE ? "" : next)
          }}
          disabled={disabled}
          required={field.required}
        >
          <SelectTrigger
            id={id}
            aria-required={field.required}
            className={cn("w-full", field.inputClassName)}
          >
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.placeholder ? (
              <SelectItem value={SELECT_EMPTY_VALUE}>
                {field.placeholder}
              </SelectItem>
            ) : null}
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          required={field.required}
          disabled={disabled}
          placeholder={field.placeholder}
          value={stringValue}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => onChange(e.target.value)}
          className={field.inputClassName}
        />
      )}
    </FormField>
  )
}
