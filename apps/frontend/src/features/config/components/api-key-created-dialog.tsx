import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")
const Copy = getIcon("actions", "copy")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
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
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false)
        onOpenChange(next)
      }}
      title={t("api_keys.created_dialog.title")}
      description={t("api_keys.created_dialog.description")}
      cancelLabel={t("api_keys.created_dialog.close")}
      footer={
        <Button type="button" onClick={() => onOpenChange(false)}>
          {t("api_keys.created_dialog.close")}
        </Button>
      }
    >
      {fullKey ? (
        <FormField
          label={t("api_keys.created_dialog.copy")}
          htmlFor="api-key-value"
        >
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
        </FormField>
      ) : null}
      <InlineAlert tone="muted">
        {t("api_keys.created_dialog.warning")}
      </InlineAlert>
    </FormDialog>
  )
}
