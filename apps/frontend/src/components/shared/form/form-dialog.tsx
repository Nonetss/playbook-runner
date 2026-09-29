import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")

import type { ReactNode, SyntheticEvent } from "react"
import { textVariants } from "@/components/shared/brand/typography"
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

const sheetClass = cn(
  "flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0",
  "max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0",
  "max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=open]:slide-in-from-bottom"
)

const footerClass =
  "shrink-0 border-t px-6 py-4 max-sm:px-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]"

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
 *
 * Below `sm` the dialog is a bottom sheet: full width, anchored to the
 * bottom edge (thumb reach), header and footer fixed, only the body scrolls.
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
    <div
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4",
        bodyClassName
      )}
    >
      {children}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sheetClass, widthClass[width], className)}>
        <DialogHeader className="shrink-0 gap-1.5 border-b px-6 py-5 pr-12 text-left max-sm:px-4 max-sm:pr-12">
          <DialogTitle className="tracking-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className={textVariants({ role: "meta" })}>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {onSubmit ? (
          <form
            id={formId}
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            {body}
            <DialogFooter className={footerClass}>
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
            <DialogFooter className={footerClass}>
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
