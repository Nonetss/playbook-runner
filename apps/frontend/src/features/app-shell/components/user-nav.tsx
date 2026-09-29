import type { User } from "better-auth"
import { getIcon } from "@/lib/icon-registry"

const LogIn = getIcon("auth", "login")
const LogOut = getIcon("actions", "logout")
const UserCircle2 = getIcon("identity", "userCircle")
const UserIcon = getIcon("identity", "user")
const Users = getIcon("resources", "users")

import { useTranslation } from "react-i18next"
import { AppLink } from "@/components/ui/app-link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { navTriggerClass } from "@/features/app-shell/nav-trigger"
import { authClient } from "@/lib/auth-client"
import { navigate } from "@/lib/navigate"
import { getQueryClient } from "@/lib/query-client"

export interface UserNavProps {
  user: (User & { role?: string | null }) | null
}

export function UserNav({ user }: UserNavProps) {
  const { t } = useTranslation("common")
  const { t: tNav } = useTranslation("nav")

  if (!user) {
    return (
      <a
        href="/login"
        aria-label={t("labels.sign_in")}
        className={navTriggerClass}
      >
        <LogIn className="size-4 shrink-0" aria-hidden />
      </a>
    )
  }

  const displayName =
    user.name?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    t("labels.default_display_name")
  const email = typeof user.email === "string" ? user.email : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={t("labels.user_menu")}
        className={navTriggerClass}
      >
        <UserIcon className="size-4 shrink-0" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56 w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5 py-0.5">
              <p className="text-sm font-medium leading-tight text-foreground">
                {displayName}
              </p>
              {email ? (
                <p className="text-muted-foreground truncate text-xs leading-tight">
                  {email}
                </p>
              ) : null}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <AppLink href="/me">
            <UserCircle2 className="size-4 shrink-0" aria-hidden />
            {tNav("links.me")}
          </AppLink>
        </DropdownMenuItem>
        {user.role === "admin" ? (
          <DropdownMenuItem asChild>
            <AppLink href="/admin/users">
              <Users className="size-4 shrink-0" aria-hidden />
              {tNav("links.admin_users")}
            </AppLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onClick={async () => {
            try {
              await authClient.signOut()
            } finally {
              // Drop the previous user's cached data before anyone else signs in.
              getQueryClient().clear()
              navigate("/login")
            }
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {t("labels.sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
