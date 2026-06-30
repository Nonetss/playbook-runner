import { useEffect, useState } from "react"
import {
  useGroupCreate,
  useGroupUpdate,
} from "@/components/features/inventory/hooks/useGroups"
import type { InventoryGroup } from "@/components/features/inventory/types"
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

export type GroupFormValues = {
  name: string
  description?: string
}

const emptyValues: GroupFormValues = {
  name: "",
  description: "",
}

type GroupFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: InventoryGroup | null
}

function valuesFromGroup(group: InventoryGroup): GroupFormValues {
  return {
    name: group.name,
    description: group.description ?? "",
  }
}

export function GroupFormModal({
  open,
  onOpenChange,
  group = null,
}: GroupFormModalProps) {
  const isEditing = !!group
  const createGroup = useGroupCreate()
  const updateGroup = useGroupUpdate()

  const [values, setValues] = useState<GroupFormValues>(emptyValues)
  const [error, setError] = useState("")

  const mutation = isEditing ? updateGroup : createGroup
  const isSubmitting = mutation.isPending

  useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setError("")
      return
    }

    if (group) {
      setValues(valuesFromGroup(group))
    } else {
      setValues(emptyValues)
    }
  }, [open, group])

  function updateField<K extends keyof GroupFormValues>(
    key: K,
    value: GroupFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")

    try {
      if (isEditing && group) {
        await updateGroup.mutateAsync({
          id: group.id,
          name: values.name,
          description: values.description || undefined,
        })
      } else {
        await createGroup.mutateAsync({
          name: values.name,
          description: values.description || undefined,
        })
      }
      onOpenChange(false)
    } catch {
      setError(
        isEditing
          ? "No se pudo actualizar el grupo."
          : "No se pudo crear el grupo."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar grupo" : "Nuevo grupo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del grupo de inventario."
              : "Crea un grupo para organizar tus dispositivos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Nombre</Label>
            <Input
              id="group-name"
              required
              disabled={isSubmitting}
              placeholder="webservers"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Descripción</Label>
            <Input
              id="group-description"
              disabled={isSubmitting}
              placeholder="Servidores web de producción"
              value={values.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
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
                  : "Crear grupo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
