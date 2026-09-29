import * as React from "react"
import { useTranslation } from "react-i18next"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAdminUserCreate } from "@/features/admin/hooks/use-admin-users"
import {
  type CreateUserInput,
  USER_ROLES,
  type UserRole,
} from "@/features/admin/types"

const emptyValues: CreateUserInput = {
  name: "",
  email: "",
  password: "",
  role: "user",
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation("account")
  const { t: tCommon } = useTranslation("common")
  const createUser = useAdminUserCreate()
  const [values, setValues] = React.useState<CreateUserInput>(emptyValues)

  React.useEffect(() => {
    if (!open) setValues(emptyValues)
  }, [open])

  function update<K extends keyof CreateUserInput>(
    key: K,
    value: CreateUserInput[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await createUser.mutateAsync(values)
      onOpenChange(false)
    } catch {
      // The mutation hook shows the error toast.
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !createUser.isPending && onOpenChange(next)}
      title={t("admin_users.create.title")}
      description={t("admin_users.create.description")}
      onSubmit={handleSubmit}
      isPending={createUser.isPending}
      submitLabel={t("admin_users.create.submit")}
      cancelLabel={tCommon("actions.cancel")}
    >
      <FormField
        label={t("profile.fields.name")}
        htmlFor="admin-user-name"
        required
      >
        <Input
          id="admin-user-name"
          required
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </FormField>
      <FormField
        label={t("profile.fields.email")}
        htmlFor="admin-user-email"
        required
      >
        <Input
          id="admin-user-email"
          type="email"
          required
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </FormField>
      <FormField
        label={t("admin_users.create.password")}
        htmlFor="admin-user-password"
        required
      >
        <Input
          id="admin-user-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => update("password", e.target.value)}
        />
      </FormField>
      <FormField
        label={t("admin_users.columns.role")}
        htmlFor="admin-user-role"
        required
      >
        <Select
          value={values.role}
          onValueChange={(value) => update("role", value as UserRole)}
        >
          <SelectTrigger id="admin-user-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`profile.roles.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </FormDialog>
  )
}
