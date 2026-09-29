import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")

import type { ReactNode, SyntheticEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const widthClass = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
} as const

/**
 * The one dialog frame: hairline header, `space-y-4` body, hairline footer.
 *
 * - With `onSubmit` the body is a `<form>` and the footer shows cancel +
 *   submit (spinner while `isPending`).
 * - Without `onSubmit` (informational or management dialogs) the footer
 *   shows `footer` when given, otherwise a single close button labelled
 *   `cancelLabel`.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  isPending = false,
  submitLabel,
  submitDisabled = false,
  cancelLabel,
  submitVariant,
  footer,
  formId,
  width = "lg",
  className,
  bodyClassName,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void | Promise<void>
  isPending?: boolean
  submitLabel?: ReactNode
  submitDisabled?: boolean
  cancelLabel: ReactNode
  submitVariant?: "destructive"
  footer?: ReactNode
  formId?: string
  width?: keyof typeof widthClass
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  const body = (
    <div className={cn("space-y-4 px-6 py-5", bodyClassName)}>{children}</div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0",
          widthClass[width],
          className
        )}
      >
        <DialogHeader className="gap-1.5 border-b px-6 py-5 text-left">
          <DialogTitle className="tracking-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs leading-relaxed">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {onSubmit ? (
          <form id={formId} onSubmit={onSubmit} className="flex flex-col">
            {body}
            <DialogFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                variant={submitVariant}
                disabled={isPending || submitDisabled}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {body}
            <DialogFooter className="border-t px-6 py-4">
              {footer ?? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {cancelLabel}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
