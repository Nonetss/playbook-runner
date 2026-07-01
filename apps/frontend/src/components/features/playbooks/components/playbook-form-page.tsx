import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import * as React from "react"
import {
  usePlaybookCreate,
  usePlaybookGet,
  usePlaybookUpdate,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import { AppProviders } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TEXTAREA_CLASS =
  "w-full min-w-0 flex-1 resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

const CONTENT_PLACEHOLDER = `---
- name: Deploy web
  hosts: all
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present`

type FormValues = {
  name: string
  description: string
  content: string
}

const EMPTY_VALUES: FormValues = { name: "", description: "", content: "" }

export type PlaybookFormPageProps = {
  /** When present the page edits an existing playbook; otherwise it creates one. */
  id?: string
}

function PlaybookFormPageInner({ id }: PlaybookFormPageProps) {
  const isEditing = !!id
  const createPlaybook = usePlaybookCreate()
  const updatePlaybook = usePlaybookUpdate()
  const {
    data: playbook,
    isPending: isLoading,
    isError: isLoadError,
  } = usePlaybookGet(id ?? "", { enabled: isEditing })

  const [values, setValues] = React.useState<FormValues>(EMPTY_VALUES)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isEditing && playbook) {
      setValues({
        name: playbook.name,
        description: playbook.description ?? "",
        content: playbook.content,
      })
    }
  }, [isEditing, playbook])

  const isSubmitting = createPlaybook.isPending || updatePlaybook.isPending

  function updateField(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: values.name,
      description: values.description || undefined,
      content: values.content,
    }
    try {
      if (isEditing && id) {
        await updatePlaybook.mutateAsync({ id, ...payload })
      } else {
        await createPlaybook.mutateAsync(payload)
      }
      window.location.href = "/playbooks"
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.")
    }
  }

  if (isEditing && isLoading) {
    return (
      <main className="flex w-full flex-1 items-center justify-center p-6 lg:px-8">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Cargando playbook...
        </div>
      </main>
    )
  }

  if (isEditing && (isLoadError || !playbook)) {
    return (
      <main className="w-full flex-1 p-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No se pudo cargar el playbook.
        </div>
        <Button asChild variant="outline" className="mt-4">
          <a href="/playbooks">
            <ArrowLeft className="size-4" />
            Volver a playbooks
          </a>
        </Button>
      </main>
    )
  }

  return (
    <main className="flex w-full flex-1 flex-col p-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Volver">
          <a href="/playbooks">
            <ArrowLeft className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar playbook" : "Nuevo playbook"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isEditing
              ? "Actualiza los datos del playbook."
              : "Define un nuevo playbook para tus automatizaciones."}
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
              placeholder="deploy-web"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description-field">Descripción</Label>
            <Input
              id="description-field"
              disabled={isSubmitting}
              placeholder="Despliega la aplicación web en producción"
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col space-y-2">
          <Label htmlFor="content-field">
            Contenido<span aria-hidden> *</span>
          </Label>
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Usa siempre{" "}
              <code className="font-mono font-semibold">hosts: all</code> en tus
              plays. Los hosts contra los que se ejecuta se eligen al lanzar el
              run; el inventario se expone bajo el grupo{" "}
              <code className="font-mono font-semibold">all</code>, así que
              cualquier otro patrón (p.&nbsp;ej.{" "}
              <code className="font-mono">docker_hosts</code>) no encontrará
              hosts y la play se saltará.
            </span>
          </div>
          <textarea
            id="content-field"
            required
            disabled={isSubmitting}
            placeholder={CONTENT_PLACEHOLDER}
            value={values.content}
            spellCheck={false}
            className={TEXTAREA_CLASS}
            style={{ minHeight: "24rem" }}
            onChange={(e) => updateField("content", e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 pb-2">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isSubmitting}
          >
            <a href="/playbooks">Cancelar</a>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear playbook"}
          </Button>
        </div>
      </form>
    </main>
  )
}

export function PlaybookFormPage(props: PlaybookFormPageProps) {
  return (
    <AppProviders>
      <PlaybookFormPageInner {...props} />
    </AppProviders>
  )
}
