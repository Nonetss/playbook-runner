import { getIcon } from "@/lib/icon-registry"

const Ban = getIcon("status", "minus")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type AdminUser,
  USER_ROLES,
  type UserRole,
} from "@/features/admin/types"
import { formatDate } from "@/lib/format"

export interface UserRowContext {
  t: TFunction<"account">
  language: string
  selfId: string | undefined
  busy: boolean
  onRoleChange: (user: AdminUser, role: UserRole) => void
  onToggleBan: (user: AdminUser) => void
}

export const userDefinition: EntityListDefinition<AdminUser, UserRowContext> = {
  getKey: (user) => user.id,
  getAccessibleLabel: (user) => user.name,
  getPrimary: (user, { t, selfId }) =>
    user.id === selfId ? (
      <>
        {user.name}{" "}
        <Text variant="meta" tone="muted">
          {t("admin_users.you")}
        </Text>
      </>
    ) : (
      user.name
    ),
  getSecondary: (user) => user.email,
  getStatus: (user, { t }) =>
    user.banned
      ? { tone: "destructive", label: t("admin_users.banned") }
      : null,
  isMuted: (user) => user.banned === true,
  metadata: [
    {
      key: "created",
      label: ({ t }) => t("admin_users.columns.created"),
      value: (user, { language }) => (
        <Text variant="data">{formatDate(user.createdAt, language)}</Text>
      ),
    },
  ],
  renderTrailing: (user, { t, selfId, busy, onRoleChange }) => (
    <Select
      value={(user.role ?? "user") as UserRole}
      disabled={user.id === selfId || busy}
      onValueChange={(value) => onRoleChange(user, value as UserRole)}
    >
      <SelectTrigger
        size="sm"
        className="w-36"
        aria-label={t("admin_users.role_for", { name: user.name })}
      >
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
  ),
  actions: [
    {
      key: "ban",
      label: (user, { t }) =>
        user.banned ? t("admin_users.unban") : t("admin_users.ban"),
      icon: Ban,
      destructive: true,
      hidden: (user, { selfId }) => user.id === selfId,
      disabled: (_, { busy }) => busy,
      onSelect: (user, { onToggleBan }) => onToggleBan(user),
    },
  ],
}
