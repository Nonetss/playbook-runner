import type { ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { cn } from "@/lib/utils"

/** Label-role caps label for a form control. */
export function FieldLabel({
  htmlFor,
  required = false,
  children,
  className,
}: {
  htmlFor?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Text
      as="label"
      variant="label"
      tone="muted"
      htmlFor={htmlFor}
      className={cn("block", className)}
    >
      {children}
      {required ? (
        <span aria-hidden className="text-destructive">
          {" "}
          *
        </span>
      ) : null}
    </Text>
  )
}

/** Label + control + optional hint or error, stacked with `space-y-2`. */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {children}
      {error ? (
        <Text as="p" variant="compact" tone="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text as="p" variant="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
    </div>
  )
}
