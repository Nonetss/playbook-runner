"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import type { Credential } from "@/components/features/credentials/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [copied, setCopied] = useState(false)
  const script = credential ? buildProvisionScript(credential) : ""

  async function handleCopy() {
    if (!script) return
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      notifySuccess("Script copiado al portapapeles")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notifyError("No se pudo copiar al portapapeles")
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
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Script de aprovisionamiento</DialogTitle>
          <DialogDescription>
            Ejecuta este script como root en el servidor de destino para crear
            el usuario <span className="font-mono">{credential?.username}</span>{" "}
            y autorizar la clave pública de esta credencial.
          </DialogDescription>
        </DialogHeader>

        <pre className="bg-muted text-foreground max-h-80 w-full min-w-0 overflow-auto rounded-md border px-3 py-2 font-mono text-xs whitespace-pre">
          {script}
        </pre>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="size-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar script
              </>
            )}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
