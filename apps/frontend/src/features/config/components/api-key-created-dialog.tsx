import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { notifyError, notifySuccess } from "@/lib/toast"

export type ApiKeyCreatedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fullKey: string | null
}

export function ApiKeyCreatedDialog({
  open,
  onOpenChange,
  fullKey,
}: ApiKeyCreatedDialogProps) {
  const { t } = useTranslation("config")
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!fullKey) return
    try {
      await navigator.clipboard.writeText(fullKey)
      setCopied(true)
      notifySuccess(t("api_keys.created_dialog.copy_success"))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notifyError(t("api_keys.created_dialog.copy_error"))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader className="gap-3 sm:flex-row sm:items-start">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <KeyRound className="size-4" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle>{t("api_keys.created_dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("api_keys.created_dialog.description")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {fullKey ? (
          <div className="space-y-2">
            <label htmlFor="api-key-value" className="text-sm font-medium">
              {t("api_keys.created_dialog.copy")}
            </label>
            <div className="flex items-stretch gap-2">
              <Input
                id="api-key-value"
                readOnly
                value={fullKey}
                className="h-auto min-w-0 flex-1 py-2.5 font-mono text-xs leading-relaxed break-all select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
                aria-label={
                  copied
                    ? t("api_keys.created_dialog.copied")
                    : t("api_keys.created_dialog.copy")
                }
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
        ) : null}

        <div
          role="note"
          className="text-muted-foreground flex items-start gap-2 text-xs"
        >
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <p>{t("api_keys.created_dialog.warning")}</p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("api_keys.created_dialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
