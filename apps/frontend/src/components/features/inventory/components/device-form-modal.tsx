import { useEffect, useState } from "react"
import {
  useDeviceCreate,
  useDeviceUpdate,
} from "@/components/features/inventory/hooks/useDevices"
import type { InventoryDevice } from "@/components/features/inventory/types"
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

export type DeviceFormValues = {
  name: string
  description?: string
  ipAddress: string
}

const emptyValues: DeviceFormValues = {
  name: "",
  description: "",
  ipAddress: "",
}

type DeviceFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  device?: InventoryDevice | null
}

function valuesFromDevice(device: InventoryDevice): DeviceFormValues {
  return {
    name: device.name,
    description: device.description ?? "",
    ipAddress: device.ipAddress,
  }
}

export function DeviceFormModal({
  open,
  onOpenChange,
  device = null,
}: DeviceFormModalProps) {
  const isEditing = !!device
  const createDevice = useDeviceCreate()
  const updateDevice = useDeviceUpdate()

  const [values, setValues] = useState<DeviceFormValues>(emptyValues)
  const [error, setError] = useState("")

  const mutation = isEditing ? updateDevice : createDevice
  const isSubmitting = mutation.isPending

  useEffect(() => {
    if (!open) {
      setValues(emptyValues)
      setError("")
      return
    }

    if (device) {
      setValues(valuesFromDevice(device))
    } else {
      setValues(emptyValues)
    }
  }, [open, device])

  function updateField<K extends keyof DeviceFormValues>(
    key: K,
    value: DeviceFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")

    try {
      if (isEditing && device) {
        await updateDevice.mutateAsync({
          id: device.id,
          name: values.name,
          description: values.description || undefined,
          ipAddress: values.ipAddress,
        })
      } else {
        await createDevice.mutateAsync({
          name: values.name,
          description: values.description || undefined,
          ipAddress: values.ipAddress,
        })
      }
      onOpenChange(false)
    } catch {
      setError(
        isEditing
          ? "No se pudo actualizar el dispositivo."
          : "No se pudo crear el dispositivo."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar dispositivo" : "Nuevo dispositivo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del dispositivo."
              : "Registra un nuevo dispositivo en tu inventario."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Nombre</Label>
            <Input
              id="device-name"
              required
              disabled={isSubmitting}
              placeholder="web-01"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-ip">Dirección IP</Label>
            <Input
              id="device-ip"
              required
              disabled={isSubmitting}
              placeholder="192.168.1.10"
              value={values.ipAddress}
              onChange={(e) => updateField("ipAddress", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-description">Descripción</Label>
            <Input
              id="device-description"
              disabled={isSubmitting}
              placeholder="Servidor web principal"
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
                  : "Crear dispositivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
