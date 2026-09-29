import { getIcon } from "@/lib/icon-registry"

const Check = getIcon("controls", "check")
const Copy = getIcon("actions", "copy")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import type { Credential } from "@/features/credentials/types"
import { notifyError, notifySuccess } from "@/lib/toast"

export type ProvisionScriptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential: Credential | null
}

function buildProvisionScript(credential: Credential): string {
  const { username, publicKey } = credential
  return `#!/bin/bash
PUBKEY="${publicKey}"

useradd -m -s /bin/bash ${username} 2>/dev/null || echo 'Usuario ya existe'
mkdir -p /home/${username}/.ssh
echo "$PUBKEY" >/home/${username}/.ssh/authorized_keys
chmod 700 /home/${username}/.ssh
chmod 600 /home/${username}/.ssh/authorized_keys
chown -R ${username}:${username} /home/${username}/.ssh
echo '${username} ALL=(ALL) NOPASSWD: ALL' >/etc/sudoers.d/${username}
chmod 440 /etc/sudoers.d/${username}
passwd -l ${username}
`
}

export function ProvisionScriptDialog({
  open,
  onOpenChange,
  credential,
}: ProvisionScriptDialogProps) {
  const { t } = useTranslation("credentials")
  const [copied, setCopied] = useState(false)
  const script = credential ? buildProvisionScript(credential) : ""

  async function handleCopy() {
    if (!script) return
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      notifySuccess(t("provision.copy_success"))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notifyError(t("provision.copy_error"))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false)
        onOpenChange(next)
      }}
      width="xl"
      title={t("provision.title")}
      description={t("provision.description", {
        username: credential?.username,
      })}
      cancelLabel={t("provision.close")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? t("provision.copied") : t("provision.copy")}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("provision.close")}
          </Button>
        </>
      }
    >
      <pre className="max-h-80 w-full min-w-0 overflow-auto rounded-md border bg-card/40 px-3 py-2 font-mono text-xs whitespace-pre text-foreground">
        {script}
      </pre>
    </FormDialog>
  )
}
