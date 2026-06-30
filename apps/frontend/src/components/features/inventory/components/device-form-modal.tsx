"use client"

import {
  useDeviceCreate,
  useDeviceUpdate,
} from "@/components/features/inventory/hooks/useDevices"
import type { InventoryDevice } from "@/components/features/inventory/types"
import { ResourceFormModal } from "@/components/shared/resource-form-modal"
import type { ResourceFormDefinition } from "@/components/shared/resource-form-types"

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

const definition: ResourceFormDefinition<DeviceFormValues> = {
  fields: [
    { name: "name", label: "Nombre", placeholder: "web-01", required: true },
    {
      name: "ipAddress",
      label: "Dirección IP",
      placeholder: "192.168.1.10",
      required: true,
    },
    {
      name: "description",
      label: "Descripción",
      placeholder: "Servidor web principal",
    },
  ],
  defaultValues: emptyValues,
  valuesFromEntity: (entity) => {
    const device = entity as InventoryDevice
    return {
      name: device.name,
      description: device.description ?? "",
      ipAddress: device.ipAddress,
    }
  },
}

export type DeviceFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  device?: InventoryDevice | null
}

export function DeviceFormModal({
  open,
  onOpenChange,
  device = null,
}: DeviceFormModalProps) {
  const isEditing = !!device
  const createDevice = useDeviceCreate()
  const updateDevice = useDeviceUpdate()
  const mutation = isEditing ? updateDevice : createDevice

  return (
    <ResourceFormModal<DeviceFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Editar dispositivo" : "Nuevo dispositivo"}
      description={
        isEditing
          ? "Actualiza los datos del dispositivo."
          : "Registra un nuevo dispositivo en tu inventario."
      }
      isEditing={isEditing}
      definition={definition}
      entity={device}
      isSubmitting={mutation.isPending}
      submitLabel="Crear dispositivo"
      editingSubmitLabel="Guardar cambios"
      formId="device-form"
      onSubmit={async (values) => {
        const payload = {
          name: values.name,
          description: values.description || undefined,
          ipAddress: values.ipAddress,
        }
        if (isEditing && device) {
          await updateDevice.mutateAsync({ id: device.id, ...payload })
        } else {
          await createDevice.mutateAsync(payload)
        }
      }}
    />
  )
}
