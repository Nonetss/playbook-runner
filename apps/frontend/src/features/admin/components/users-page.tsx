import { getIcon } from "@/lib/icon-registry"

const Users = getIcon("resources", "users")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateUserDialog } from "@/features/admin/components/create-user-dialog"
import {
  useAdminUserSetBanned,
  useAdminUserSetRole,
  useAdminUsersList,
} from "@/features/admin/hooks/use-admin-users"
import {
  type AdminUser,
  USER_ROLES,
  type UserRole,
} from "@/features/admin/types"
import { authClient } from "@/lib/auth-client"

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const { t } = useTranslation("account")
  const setRole = useAdminUserSetRole()
  const setBanned = useAdminUserSetBanned()
  const role = (user.role ?? "user") as UserRole
  const busy = setRole.isPending || setBanned.isPending

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {user.name}
          {isSelf ? (
            <span className="text-muted-foreground ml-2 text-xs">
              {t("admin_users.you")}
            </span>
          ) : null}
        </p>
        <p className="text-muted-foreground truncate text-sm">{user.email}</p>
      </div>
      {user.banned ? (
        <Badge variant="destructive">{t("admin_users.banned")}</Badge>
      ) : null}
      <div className="flex items-center gap-2">
        <Select
          value={role}
          disabled={isSelf || busy}
          onValueChange={(value) =>
            setRole.mutate({ userId: user.id, role: value as UserRole })
          }
        >
          <SelectTrigger
            className="w-40"
            aria-label={t("admin_users.role_for", { name: user.name })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`profile.roles.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={isSelf || busy}
          onClick={() =>
            setBanned.mutate({ userId: user.id, banned: !user.banned })
          }
        >
          {user.banned ? t("admin_users.unban") : t("admin_users.ban")}
        </Button>
      </div>
    </li>
  )
}

function UsersPageInner() {
  const { t } = useTranslation("account")
  const { data: users = [], isPending, isError, refetch } = useAdminUsersList()
  const { data: session } = authClient.useSession()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <ResourcePage
      title={t("admin_users.title")}
      description={t("admin_users.subtitle")}
      createLabel={t("admin_users.create.open")}
      onCreate={() => setCreateOpen(true)}
    >
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={users}
        empty={{
          title: t("admin_users.empty"),
          icon: <Users className="size-5" />,
        }}
      >
        {(items) => (
          <ul className="space-y-3">
            {items.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === session?.user.id}
              />
            ))}
          </ul>
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function UsersPage() {
  return (
    <AppProviders>
      <UsersPageInner />
    </AppProviders>
  )
}
