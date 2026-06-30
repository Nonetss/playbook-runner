"use client"

import * as React from "react"
import type {
  FieldDefinition,
  ResourceFormDefinition,
} from "@/components/shared/resource-form-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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

const TEXTAREA_BASE_CLASS =
  "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

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
  submitLabel = "Crear",
  editingSubmitLabel = "Guardar cambios",
  submitErrorMessage,
  formId = "resource-form",
}: ResourceFormModalProps<TValues>) {
  const [values, setValues] = React.useState<TValues>(definition.defaultValues)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setValues(definition.defaultValues)
      setError(null)
      return
    }
    setValues(
      entity ? definition.valuesFromEntity(entity) : definition.defaultValues
    )
  }, [open, entity, definition])

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
          (err instanceof Error ? err.message : "No se pudo guardar.")
      )
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : isEditing
                  ? editingSubmitLabel
                  : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className="space-y-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span aria-hidden> *</span> : null}
      </Label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          required={field.required}
          disabled={disabled}
          placeholder={field.placeholder}
          value={stringValue}
          rows={field.rows ?? 5}
          onChange={(e) => onChange(e.target.value)}
          className={cn(TEXTAREA_BASE_CLASS, field.inputClassName)}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          required={field.required}
          disabled={disabled}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            field.inputClassName
          )}
        >
          {field.placeholder ? (
            <option value="">{field.placeholder}</option>
          ) : null}
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
    </div>
  )
}
