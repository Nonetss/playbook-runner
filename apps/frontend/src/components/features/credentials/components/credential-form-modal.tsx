import { useEffect, useState } from "react"
import {
  useCredentialCreate,
  useCredentialUpdate,
} from "@/components/features/credentials/hooks/useCredentials"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type CredentialFormValues = {
  name: string
  username: string
  privateKey: string
  publicKey: string
}

const emptyValues: CredentialFormValues = {
  name: "",
  username: "",
  privateKey: "",
  publicKey: "",
}

type CredentialFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential?: Credential | null
}

function valuesFromCredential(credential: Credential): CredentialFormValues {
  return {
    name: credential.name,
    username: credential.username,
    privateKey: credential.privateKey,
    publicKey: credential.publicKey,
  }
}

export function CredentialFormModal({
  open,
  onOpenChange,
  credential = null,
}: CredentialFormModalProps) {
  const isEditing = !!credential
  const createCredential = useCredentialCreate()
  const updateCredential = useCredentialUpdate()

  const [values, setValues] = useState<CredentialFormValues>(emptyValues)
  const [error, setError] = useState("")

  const mutation = isEditing ? updateCredential : createCredential
  const isSubmitting = mutation.isPending

  useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setError("")
      return
    }

    if (credential) {
      setValues(valuesFromCredential(credential))
    } else {
      setValues(emptyValues)
    }
  }, [open, credential])

  function updateField<K extends keyof CredentialFormValues>(
    key: K,
    value: CredentialFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")

    try {
      if (isEditing && credential) {
        await updateCredential.mutateAsync({ id: credential.id, ...values })
      } else {
        await createCredential.mutateAsync(values)
      }
      onOpenChange(false)
    } catch {
      setError(
        isEditing
          ? "No se pudo actualizar la credencial."
          : "No se pudo crear la credencial."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar credencial" : "Nueva credencial"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos de acceso SSH."
              : "Añade una credencial SSH para tus despliegues."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credential-name">Nombre</Label>
            <Input
              id="credential-name"
              required
              disabled={isSubmitting}
              placeholder="prod-server"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-username">Usuario</Label>
            <Input
              id="credential-username"
              required
              disabled={isSubmitting}
              placeholder="deploy"
              value={values.username}
              onChange={(e) => updateField("username", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-private-key">Clave privada</Label>
            <textarea
              id="credential-private-key"
              required
              disabled={isSubmitting}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              value={values.privateKey}
              onChange={(e) => updateField("privateKey", e.target.value)}
              rows={5}
              className={cn(
                "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-public-key">Clave pública</Label>
            <textarea
              id="credential-public-key"
              required
              disabled={isSubmitting}
              placeholder="ssh-ed25519 AAAA..."
              value={values.publicKey}
              onChange={(e) => updateField("publicKey", e.target.value)}
              rows={3}
              className={cn(
                "w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
              )}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear credencial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
