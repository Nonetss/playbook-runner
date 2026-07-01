import * as React from "react"
import {
  useCredentialCreate,
  useCredentialGenerate,
  useCredentialUpdate,
} from "@/components/features/credentials/hooks/useCredentials"
import type { Credential } from "@/components/features/credentials/types"
import { TEXTAREA_BASE_CLASS } from "@/components/shared/resource-form-modal"
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

function valuesFromEntity(credential: Credential): CredentialFormValues {
  return {
    name: credential.name,
    username: credential.username,
    privateKey: credential.privateKey,
    publicKey: credential.publicKey,
  }
}

type KeyMode = "import" | "generate"

export type CredentialFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential?: Credential | null
}

export function CredentialFormModal({
  open,
  onOpenChange,
  credential = null,
}: CredentialFormModalProps) {
  const isEditing = !!credential
  const createCredential = useCredentialCreate()
  const updateCredential = useCredentialUpdate()
  const generateKeyPair = useCredentialGenerate()
  const mutation = isEditing ? updateCredential : createCredential
  const isSubmitting = mutation.isPending

  const [mode, setMode] = React.useState<KeyMode>("import")
  const [values, setValues] = React.useState<CredentialFormValues>(emptyValues)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setMode("import")
      setError(null)
      return
    }
    setValues(credential ? valuesFromEntity(credential) : emptyValues)
  }, [open, credential])

  function updateField<K extends keyof CredentialFormValues>(
    key: K,
    value: CredentialFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function switchMode(next: KeyMode) {
    if (next === mode) return
    setMode(next)
    setValues((current) => ({ ...current, privateKey: "", publicKey: "" }))
  }

  async function handleGenerate() {
    setError(null)
    try {
      const generated = await generateKeyPair.mutateAsync({
        comment: values.username.trim() || values.name.trim() || undefined,
      })
      setValues((current) => ({
        ...current,
        privateKey: generated.privateKey,
        publicKey: generated.publicKey,
      }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo generar el par de claves."
      )
    }
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (isEditing && credential) {
        await updateCredential.mutateAsync({ id: credential.id, ...values })
      } else {
        await createCredential.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la credencial."
      )
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return
    onOpenChange(next)
  }

  const showGeneratedKeys = mode === "generate" && !!values.privateKey

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <form
          id="credential-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {!isEditing ? (
            <div className="flex gap-1 rounded-md border bg-muted p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "import" ? "default" : "ghost"}
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => switchMode("import")}
              >
                Importar clave existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "generate" ? "default" : "ghost"}
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => switchMode("generate")}
              >
                Generar nueva clave
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name-field">
              Nombre<span aria-hidden> *</span>
            </Label>
            <Input
              id="name-field"
              required
              disabled={isSubmitting}
              placeholder="prod-server"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username-field">
              Usuario<span aria-hidden> *</span>
            </Label>
            <Input
              id="username-field"
              required
              disabled={isSubmitting}
              placeholder="deploy"
              value={values.username}
              onChange={(e) => updateField("username", e.target.value)}
            />
          </div>

          {mode === "import" || isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="privateKey-field">
                  Clave privada<span aria-hidden> *</span>
                </Label>
                <textarea
                  id="privateKey-field"
                  required
                  disabled={isSubmitting}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  value={values.privateKey}
                  rows={5}
                  onChange={(e) => updateField("privateKey", e.target.value)}
                  className={cn(TEXTAREA_BASE_CLASS)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicKey-field">
                  Clave pública<span aria-hidden> *</span>
                </Label>
                <textarea
                  id="publicKey-field"
                  required
                  disabled={isSubmitting}
                  placeholder="ssh-ed25519 AAAA..."
                  value={values.publicKey}
                  rows={3}
                  onChange={(e) => updateField("publicKey", e.target.value)}
                  className={cn(TEXTAREA_BASE_CLASS)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {showGeneratedKeys
                    ? "Par de claves ed25519 generado. Se guardará al crear la credencial."
                    : "Genera un par de claves SSH ed25519 nuevo."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting || generateKeyPair.isPending}
                  onClick={handleGenerate}
                >
                  {generateKeyPair.isPending
                    ? "Generando..."
                    : showGeneratedKeys
                      ? "Regenerar"
                      : "Generar par de claves"}
                </Button>
              </div>

              {showGeneratedKeys ? (
                <div className="space-y-2">
                  <Label htmlFor="generated-public-key">Clave pública</Label>
                  <textarea
                    id="generated-public-key"
                    readOnly
                    value={values.publicKey}
                    rows={3}
                    className={cn(TEXTAREA_BASE_CLASS, "opacity-80")}
                  />
                </div>
              ) : null}
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (mode === "generate" && !values.privateKey && !isEditing)
              }
            >
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
