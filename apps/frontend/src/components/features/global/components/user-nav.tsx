import type { User } from "better-auth"
import { LogIn, LogOut, UserCircle2, User as UserIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

const triggerClass =
  "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-xs transition-colors outline-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"

export interface UserNavProps {
  user: User | null
}

export function UserNav({ user }: UserNavProps) {
  const { t } = useTranslation("common")
  const { t: tNav } = useTranslation("nav")

  if (!user) {
    return (
      <a
        href="/login"
        aria-label={t("labels.sign_in")}
        className={triggerClass}
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
        className={triggerClass}
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
          <a href="/me">
            <UserCircle2 className="size-4 shrink-0" aria-hidden />
            {tNav("links.me")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onClick={async () => {
            await authClient.signOut()
            window.location.href = "/login"
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {t("labels.sign_out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
