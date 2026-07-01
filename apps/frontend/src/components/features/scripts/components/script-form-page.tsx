import { ArrowLeft, Loader2 } from "lucide-react"
import * as React from "react"
import {
  useScriptCreate,
  useScriptGet,
  useScriptUpdate,
} from "@/components/features/scripts/hooks/useScripts"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TEXTAREA_CLASS =
  "w-full min-w-0 flex-1 resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const CONTENT_PLACEHOLDER = `#!/bin/bash
set -euo pipefail

echo "Hello from $(hostname)"
uptime`

type FormValues = {
  name: string
  description: string
  content: string
}

const EMPTY_VALUES: FormValues = { name: "", description: "", content: "" }

export type ScriptFormPageProps = {
  /** When present the page edits an existing script; otherwise it creates one. */
  id?: string
}

function ScriptFormPageInner({ id }: ScriptFormPageProps) {
  const isEditing = !!id
  const createScript = useScriptCreate()
  const updateScript = useScriptUpdate()
  const {
    data: script,
    isPending: isLoading,
    isError: isLoadError,
  } = useScriptGet(id ?? "", { enabled: isEditing })

  const [values, setValues] = React.useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = React.useState<string | null>(null)
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (isEditing && script) {
      setValues({
        name: script.name,
        description: script.description ?? "",
        content: script.content,
      })
    }
  }, [isEditing, script])

  const isSubmitting = createScript.isPending || updateScript.isPending

  const trimmedName = values.name.trim()
  const trimmedContent = values.content.trim()
  const nameMissing = touched && trimmedName.length === 0
  const contentMissing = touched && trimmedContent.length === 0

  function updateField(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setTouched(true)
    if (trimmedName.length === 0 || trimmedContent.length === 0) return
    setError(null)
    const payload = {
      name: trimmedName,
      description: values.description || undefined,
      content: values.content,
    }
    try {
      if (isEditing && id) {
        await updateScript.mutateAsync({ id, ...payload })
      } else {
        await createScript.mutateAsync(payload)
      }
      window.location.href = "/scripts"
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.")
    }
  }

  if (isEditing && isLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6 lg:px-8">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando script...
        </div>
      </main>
    )
  }

  if (isEditing && (isLoadError || !script)) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el script.
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/scripts">
            <ArrowLeft className="size-4" />
            Volver a scripts
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="flex w-full flex-1 flex-col p-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
          <a href="/scripts">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar script" : "Nuevo script"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing
              ? "Actualiza los datos del script."
              : "Define un script bash reutilizable para tus tareas operativas."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name-field">
              Nombre<span aria-hidden> *</span>
            </Label>
            <Input
              id="name-field"
              required
              disabled={isSubmitting}
              placeholder="backup-nightly"
              value={values.name}
              onBlur={() => setTouched(true)}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={nameMissing}
            />
            {nameMissing ? (
              <p className="text-destructive text-xs">
                El nombre es obligatorio.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description-field">Descripción</Label>
            <Input
              id="description-field"
              disabled={isSubmitting}
              placeholder="Copia diaria de la base de datos"
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col space-y-2">
          <Label htmlFor="content-field">
            Contenido<span aria-hidden> *</span>
          </Label>
          <textarea
            id="content-field"
            required
            disabled={isSubmitting}
            placeholder={CONTENT_PLACEHOLDER}
            value={values.content}
            spellCheck={false}
            className={TEXTAREA_CLASS}
            style={{ minHeight: "24rem" }}
            onBlur={() => setTouched(true)}
            onChange={(e) => updateField("content", e.target.value)}
            aria-invalid={contentMissing}
          />
          {contentMissing ? (
            <p className="text-destructive text-xs">
              El contenido del script es obligatorio.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pb-2">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <a href="/scripts">Cancelar</a>
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              trimmedName.length === 0 ||
              trimmedContent.length === 0
            }
          >
            {isSubmitting
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear script"}
          </Button>
        </div>
      </form>
    </main>
  )
}

export function ScriptFormPage(props: ScriptFormPageProps) {
  return (
    <AppProviders>
      <ScriptFormPageInner {...props} />
    </AppProviders>
  )
}
