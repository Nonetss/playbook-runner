import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  /** Async action executed on confirm. Resolves to true to close, false to keep open. */
  onConfirm: () => Promise<boolean> | boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common")
  const [isExecuting, setIsExecuting] = React.useState(false)

  const handleOpenChange = (next: boolean) => {
    if (isExecuting) return
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (isExecuting) return
    setIsExecuting(true)
    try {
      const shouldClose = await onConfirm()
      if (shouldClose !== false) {
        onOpenChange(false)
      }
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isExecuting}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel ?? t("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={isExecuting}
            onClick={handleConfirm}
          >
            {isExecuting && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel ?? t("actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
