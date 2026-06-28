import type { Session, User } from "better-auth"
import { Calendar, Hash, Mail, ShieldCheck, UserCircle2 } from "lucide-react"
import type React from "react"
import { Badge } from "@/components/ui/badge"

type ProfilePageProps = {
  user: User
  session: Session
}

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-green-500/15 text-green-700 dark:text-green-400",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
]

function ProfileHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Información de tu cuenta
      </p>
    </div>
  )
}

function ProfileCard({ user }: { user: User }) {
  const displayName =
    user.name?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    "Usuario"

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const color = AVATAR_COLORS[displayName.charCodeAt(0) % AVATAR_COLORS.length]
  const role = (user as { role?: string }).role ?? "user"
  const createdAt = (user as { createdAt?: string | Date }).createdAt

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="bg-primary/5 p-6 border-b flex items-center gap-4">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-md text-xl font-bold ${color}`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                role === "admin"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0 text-xs"
                  : role === "pending"
                    ? "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-0 text-xs"
                    : "text-xs"
              }
            >
              {role === "admin"
                ? "Administrador"
                : role === "pending"
                  ? "Pendiente"
                  : "Usuario"}
            </Badge>
            {(user as { emailVerified?: boolean }).emailVerified && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-xs gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                Verificado
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-muted/40 p-2">
        <DetailRow
          icon={<UserCircle2 className="h-4 w-4" />}
          label="Nombre"
          value={displayName}
        />
        <DetailRow
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          value={user.email}
        />
        <DetailRow
          icon={<Hash className="h-4 w-4" />}
          label="ID de cuenta"
          value={
            <span className="font-mono text-xs select-all">{user.id}</span>
          }
        />
        {createdAt && (
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Miembro desde"
            value={new Date(createdAt).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        )}
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors rounded-md mx-2">
      <div className="bg-primary/10 p-2 rounded-md shrink-0">{icon}</div>
      <span className="text-xs text-muted-foreground w-28 shrink-0">
        {label}
      </span>
      <span className="text-sm truncate">{value}</span>
    </div>
  )
}

export function ProfilePage({ user, session: _session }: ProfilePageProps) {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <ProfileHeader />
        {user ? <ProfileCard user={user} /> : null}
      </div>
    </main>
  )
}
