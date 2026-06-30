/**
 * A single input field in a resource form.
 *
 * The renderer maps `type` to the matching `<Input>` (text) or `<textarea>`
 * variant. Multi-line content (YAML, SSH keys) should use `type: "textarea"`.
 *
 * Required fields render the native `required` attribute; `placeholder` is
 * shown when the field is empty.
 *
 * `name` MUST match the key in the form values object passed to the modal.
 */
export interface FieldDefinition {
  name: string
  label: string
  type?: "text" | "textarea"
  placeholder?: string
  required?: boolean
  rows?: number
  /** Optional className merged onto the input element (e.g. monospace). */
  inputClassName?: string
}

/**
 * Definition of the resource form modal. A resource declares its fields via
 * `fields`; the modal renders them in order, manages local values, calls the
 * provided `mutation` and surfaces the result via the shared toasts.
 */
export interface ResourceFormDefinition<
  TValues extends Record<string, unknown>,
> {
  fields: ReadonlyArray<FieldDefinition>
  defaultValues: TValues
  /** Maps the current record being edited (or null when creating) to form values. */
  valuesFromEntity: (entity: unknown) => TValues
}

export type ResourceFormErrors = Partial<Record<string, string>>

export type ResourceFormSubmit<TValues> = (
  values: TValues,
  context: { isEditing: boolean }
) => Promise<void>
