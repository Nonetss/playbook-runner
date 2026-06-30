import { useEffect, useState } from "react"
import {
  usePlaybookCreate,
  usePlaybookUpdate,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import type { Playbook } from "@/components/features/playbooks/types"
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

export type PlaybookFormValues = {
  name: string
  description?: string
  content: string
}

const emptyValues: PlaybookFormValues = {
  name: "",
  description: "",
  content: "",
}

type PlaybookFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbook?: Playbook | null
}

function valuesFromPlaybook(playbook: Playbook): PlaybookFormValues {
  return {
    name: playbook.name,
    description: playbook.description ?? "",
    content: playbook.content,
  }
}

export function PlaybookFormModal({
  open,
  onOpenChange,
  playbook = null,
}: PlaybookFormModalProps) {
  const isEditing = !!playbook
  const createPlaybook = usePlaybookCreate()
  const updatePlaybook = usePlaybookUpdate()

  const [values, setValues] = useState<PlaybookFormValues>(emptyValues)
  const [error, setError] = useState("")

  const mutation = isEditing ? updatePlaybook : createPlaybook
  const isSubmitting = mutation.isPending

  useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setError("")
      return
    }

    if (playbook) {
      setValues(valuesFromPlaybook(playbook))
    } else {
      setValues(emptyValues)
    }
  }, [open, playbook])

  function updateField<K extends keyof PlaybookFormValues>(
    key: K,
    value: PlaybookFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")

    try {
      if (isEditing && playbook) {
        await updatePlaybook.mutateAsync({
          id: playbook.id,
          name: values.name,
          description: values.description || undefined,
          content: values.content,
        })
      } else {
        await createPlaybook.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          content: values.content,
        })
      }
      onOpenChange(false)
    } catch {
      setError(
        isEditing
          ? "No se pudo actualizar el playbook."
          : "No se pudo crear el playbook."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar playbook" : "Nuevo playbook"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del playbook."
              : "Define un nuevo playbook para tus automatizaciones."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playbook-name">Nombre</Label>
            <Input
              id="playbook-name"
              required
              disabled={isSubmitting}
              placeholder="deploy-web"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playbook-description">Descripción</Label>
            <Input
              id="playbook-description"
              disabled={isSubmitting}
              placeholder="Despliega la aplicación web en producción"
              value={values.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playbook-content">Contenido</Label>
            <textarea
              id="playbook-content"
              required
              disabled={isSubmitting}
              placeholder={`---
- name: Deploy web
  hosts: webservers
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present`}
              value={values.content}
              onChange={(e) => updateField("content", e.target.value)}
              rows={12}
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
                  : "Crear playbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
