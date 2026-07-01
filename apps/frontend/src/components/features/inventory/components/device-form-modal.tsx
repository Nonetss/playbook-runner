import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useCredentialsList } from "@/components/features/credentials/hooks/useCredentials"
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
  portSSH?: string
  credentialId?: string | null
}

const emptyValues: DeviceFormValues = {
  name: "",
  description: "",
  ipAddress: "",
  portSSH: "22",
  credentialId: "",
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
  const { t } = useTranslation("inventory")
  const isEditing = !!device
  const createDevice = useDeviceCreate()
  const updateDevice = useDeviceUpdate()
  const mutation = isEditing ? updateDevice : createDevice

  const { data: credentials = [] } = useCredentialsList()
  const credentialOptions = useMemo(
    () =>
      credentials.map((credential) => ({
        value: credential.id,
        label: credential.name,
      })),
    [credentials]
  )

  const definition: ResourceFormDefinition<DeviceFormValues> = {
    fields: [
      {
        name: "name",
        label: t("device_form.name_label"),
        placeholder: t("device_form.name_placeholder"),
        required: true,
      },
      {
        name: "ipAddress",
        label: t("device_form.ip_label"),
        placeholder: t("device_form.ip_placeholder"),
        required: true,
      },
      {
        name: "portSSH",
        label: t("device_form.ssh_port_label"),
        type: "number",
        placeholder: "22",
        min: 1,
        max: 65535,
      },
      {
        name: "description",
        label: t("device_form.description_label"),
        placeholder: t("device_form.description_placeholder"),
      },
      {
        name: "credentialId",
        label: t("device_form.credential_label"),
        type: "select",
        placeholder: t("device_form.credential_placeholder"),
        options: credentialOptions,
      },
    ],
    defaultValues: emptyValues,
    valuesFromEntity: (entity) => {
      const d = entity as InventoryDevice
      return {
        name: d.name,
        description: d.description ?? "",
        ipAddress: d.ipAddress,
        portSSH: String(d.portSSH ?? 22),
        credentialId: d.credentialId ?? "",
      }
    },
  }

  return (
    <ResourceFormModal<DeviceFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={
        isEditing ? t("device_form.edit_title") : t("device_form.create_title")
      }
      description={
        isEditing
          ? t("device_form.edit_subtitle")
          : t("device_form.create_subtitle")
      }
      isEditing={isEditing}
      definition={definition}
      entity={device}
      isSubmitting={mutation.isPending}
      submitLabel={t("device_form.create")}
      editingSubmitLabel={t("device_form.save_changes")}
      formId="device-form"
      onSubmit={async (values) => {
        const parsedPort = values.portSSH ? Number(values.portSSH) : NaN
        const payload = {
          name: values.name,
          description: values.description || undefined,
          ipAddress: values.ipAddress,
          portSSH: Number.isFinite(parsedPort) ? parsedPort : undefined,
          credentialId: values.credentialId ? values.credentialId : null,
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
