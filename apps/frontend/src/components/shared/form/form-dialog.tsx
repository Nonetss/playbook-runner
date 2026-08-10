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

/** Shared dialog chrome; callers retain form fields and submit state. */
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
  formId,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void | Promise<void>
  isPending?: boolean
  submitLabel: ReactNode
  submitDisabled?: boolean
  cancelLabel: ReactNode
  submitVariant?: "destructive"
  formId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg",
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
        <form id={formId} onSubmit={onSubmit} className="flex flex-col">
          <div className="space-y-4 px-6 py-5">{children}</div>
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
      </DialogContent>
    </Dialog>
  )
}
