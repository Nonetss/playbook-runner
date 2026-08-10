import type { Session, User } from "better-auth"
import { getIcon } from "@/lib/icon-registry"

const Calendar = getIcon("scheduling", "calendar")
const Hash = getIcon("identity", "hash")
const Mail = getIcon("identity", "email")
const ShieldCheck = getIcon("status", "verified")
const UserCircle2 = getIcon("identity", "userCircle")

import type React from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { Badge } from "@/components/ui/badge"

type ProfilePageProps = {
  user: User
  session: Session
  locale?: string
}

function useProfileT() {
  return useTranslation("account")
}

function ProfileHeader() {
  const { t } = useProfileT()
  return (
    <PageHero
      title={t("profile.title")}
      description={t("profile.subtitle")}
      className="mb-6"
    />
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

  const role = (user as { role?: string }).role ?? "user"
  const createdAt = (user as { createdAt?: string | Date }).createdAt

  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-ES"

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <div className="flex items-center gap-4 border-b bg-primary/5 p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xl font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant={role === "admin" ? "default" : "secondary"}
              className="text-xs"
            >
              {role === "admin"
                ? t("profile.roles.admin")
                : role === "pending"
                  ? t("profile.roles.pending")
                  : t("profile.roles.user")}
            </Badge>
            {(user as { emailVerified?: boolean }).emailVerified && (
              <Badge variant="secondary" className="gap-1 text-xs text-primary">
                <ShieldCheck className="h-3 w-3" />
                {t("profile.verified")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/60 p-2">
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
    <div className="mx-2 flex items-center gap-3 rounded-md px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="flex shrink-0 rounded-md bg-primary/10 p-2 text-primary">
        {icon}
      </div>
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
    <PageShell maxWidth="3xl">
      <ProfileHeader />
      {user ? <ProfileCard user={user} /> : null}
    </PageShell>
  )
}
