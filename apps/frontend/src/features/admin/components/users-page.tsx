import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Users = getIcon("resources", "users")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { CreateUserDialog } from "@/features/admin/components/create-user-dialog"
import { userDefinition } from "@/features/admin/definitions/user.definition"
import {
  useAdminUserSetBanned,
  useAdminUserSetRole,
  useAdminUsersList,
} from "@/features/admin/hooks/use-admin-users"
import { authClient } from "@/lib/auth-client"

function UsersPageInner() {
  const { t, i18n } = useTranslation("account")
  const { t: tCommon } = useTranslation("common")
  const query = useAdminUsersList()
  const { data: session } = authClient.useSession()
  const setRole = useAdminUserSetRole()
  const setBanned = useAdminUserSetBanned()
  const [createOpen, setCreateOpen] = useState(false)

  const createButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {t("admin_users.create.open")}
    </Button>
  )

  return (
    <>
      <ResourceOverview
        surface="adminUsers"
        heroMeta={
          <HeroCount
            segments={[
              {
                count: query.data?.length ?? 0,
                label: tCommon("labels.total"),
              },
            ]}
          />
        }
        heroAction={createButton}
        query={query}
        isEmpty={(users) => users.length === 0}
        empty={{ icon: <Users />, title: t("admin_users.empty") }}
      >
        {(users) => (
          <EntityCardGrid
            items={users}
            definition={userDefinition}
            context={{
              t,
              language: i18n.language,
              selfId: session?.user.id,
              busy: setRole.isPending || setBanned.isPending,
              onRoleChange: (user, role) =>
                setRole.mutate({ userId: user.id, role }),
              onToggleBan: (user) =>
                setBanned.mutate({ userId: user.id, banned: !user.banned }),
            }}
          />
        )}
      </ResourceOverview>
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export function UsersPage() {
  return (
    <AppProviders>
      <UsersPageInner />
    </AppProviders>
  )
}
