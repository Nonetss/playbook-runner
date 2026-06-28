import { LogIn, LogOut, Shield, User, UserCircle2 } from "lucide-react"
import { useEffect, useState } from "react"
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
  "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground flex h-9 w-9 items-center justify-center border transition-colors outline-none data-[state=open]:bg-secondary data-[state=open]:text-foreground"

export function UserNav() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    setIsAdminRoute(window.location.pathname.startsWith("/admin"))
  }, [])

  if (!mounted || !user) {
    return (
      <a href="/login" aria-label="Iniciar sesión" className={triggerClass}>
        <LogIn className="size-4 shrink-0" aria-hidden />
      </a>
    )
  }

  const displayName =
    user.name?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    "Usuario"
  const email = typeof user.email === "string" ? user.email : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Menú de cuenta"
        className={triggerClass}
      >
        <User className="size-4 shrink-0" aria-hidden />
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
        <DropdownMenuItem onClick={() => (window.location.href = "/me")}>
          <UserCircle2 className="size-4 shrink-0" aria-hidden />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {(user as { role?: string } | null)?.role === "admin" &&
          (isAdminRoute ? (
            <DropdownMenuItem onClick={() => (window.location.href = "/")}>
              <Shield className="size-4 shrink-0" aria-hidden />
              Salir del panel de administración
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => (window.location.href = "/admin")}>
              <Shield className="size-4 shrink-0" aria-hidden />
              Panel de administración
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer gap-2"
          onSelect={async (e) => {
            e.preventDefault()
            await authClient.signOut()
            window.location.href = "/login"
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
