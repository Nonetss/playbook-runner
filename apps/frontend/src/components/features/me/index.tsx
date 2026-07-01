import type { Session, User } from "better-auth"
import { Calendar, Hash, Mail, ShieldCheck, UserCircle2 } from "lucide-react"
import type React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Badge } from "@/components/ui/badge"

type ProfilePageProps = {
  user: User
  session: Session
  locale?: string
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

function useProfileT() {
  return useTranslation("account")
}

function ProfileHeader() {
  const { t } = useProfileT()
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("profile.title")}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("profile.subtitle")}
      </p>
    </div>
  )
}

function ProfileCard({ user }: { user: User }) {
  const { t, i18n } = useProfileT()
  const displayName =
    user.name?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    t("profile.default_display_name")

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const color = AVATAR_COLORS[displayName.charCodeAt(0) % AVATAR_COLORS.length]
  const role = (user as { role?: string }).role ?? "user"
  const createdAt = (user as { createdAt?: string | Date }).createdAt

  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-ES"

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
                ? t("profile.roles.admin")
                : role === "pending"
                  ? t("profile.roles.pending")
                  : t("profile.roles.user")}
            </Badge>
            {(user as { emailVerified?: boolean }).emailVerified && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-700 dark:text-green-400 border-0 text-xs gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                {t("profile.verified")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-muted/40 p-2">
        <DetailRow
          icon={<UserCircle2 className="h-4 w-4" />}
          label={t("profile.fields.name")}
          value={displayName}
        />
        <DetailRow
          icon={<Mail className="h-4 w-4" />}
          label={t("profile.fields.email")}
          value={user.email}
        />
        <DetailRow
          icon={<Hash className="h-4 w-4" />}
          label={t("profile.fields.account_id")}
          value={
            <span className="font-mono text-xs select-all">{user.id}</span>
          }
        />
        {createdAt ? (
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t("profile.fields.member_since")}
            value={new Date(createdAt).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        ) : null}
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

// Standalone `client:only` island, so it must sit behind the i18n provider
// (which gates render until i18next is ready). Without it the island wins the
// race against the async global init and paints raw keys (e.g. `profile.title`).
export function ProfilePage({ user, session, locale }: ProfilePageProps) {
  return (
    <AppProviders initialLocale={locale}>
      <ProfilePageInner user={user} session={session} />
    </AppProviders>
  )
}

function ProfilePageInner({ user, session: _session }: ProfilePageProps) {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <ProfileHeader />
        {user ? <ProfileCard user={user} /> : null}
      </div>
    </main>
  )
}
