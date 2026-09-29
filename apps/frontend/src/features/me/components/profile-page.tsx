import type { Session, User } from "better-auth"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import {
  MetadataCell,
  MetadataList,
} from "@/components/shared/data-display/metadata-cell"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { formatDate } from "@/lib/format"

type ProfilePageProps = {
  user: User
  session: Session
  locale?: string
}

type ProfileUser = User & {
  role?: string | null
  createdAt?: string | Date
  emailVerified?: boolean
}

function ProfilePageInner({ user }: { user: ProfileUser }) {
  const { t, i18n } = useTranslation("account")
  const displayName =
    user.name?.trim() ||
    (typeof user.email === "string" ? user.email.split("@")[0] : null) ||
    t("profile.default_display_name")
  const role = user.role ?? "user"
  const roleLabel =
    role === "admin"
      ? t("profile.roles.admin")
      : role === "pending"
        ? t("profile.roles.pending")
        : t("profile.roles.user")

  return (
    <PageShell maxWidth="3xl">
      <PageHero
        surface="me"
        status={
          <StatusTag dotTone={role === "pending" ? "muted" : "primary"}>
            {roleLabel}
          </StatusTag>
        }
      />

      {role === "pending" ? (
        <InlineAlert tone="muted" title={t("pending.title")}>
          {t("pending.description")}
        </InlineAlert>
      ) : null}

      <section className="flex flex-col gap-1">
        <Text as="p" variant="headline" className="truncate">
          {displayName}
        </Text>
        <Text as="p" variant="meta" tone="muted" className="truncate">
          {user.email}
        </Text>
        <MetadataList columns={2} className="mt-4">
          <MetadataCell label={t("profile.fields.name")}>
            {displayName}
          </MetadataCell>
          <MetadataCell
            label={t("profile.fields.email")}
            action={
              user.emailVerified ? (
                <StatusTag dotTone="foreground" className="ml-2">
                  {t("profile.verified")}
                </StatusTag>
              ) : undefined
            }
          >
            <span className="truncate">{user.email}</span>
          </MetadataCell>
          <MetadataCell label={t("profile.fields.account_id")}>
            <Text variant="data" className="select-all">
              {user.id}
            </Text>
          </MetadataCell>
          {user.createdAt ? (
            <MetadataCell label={t("profile.fields.member_since")}>
              <Text variant="data">
                {formatDate(user.createdAt, i18n.language)}
              </Text>
            </MetadataCell>
          ) : null}
        </MetadataList>
      </section>
    </PageShell>
  )
}

// Standalone `client:only` island, so it must sit behind the i18n provider
// (which gates render until i18next is ready). Without it the island wins the
// race against the async global init and paints raw keys (e.g. `profile.title`).
export function ProfilePage({ user, locale }: ProfilePageProps) {
  return (
    <AppProviders initialLocale={locale}>
      <ProfilePageInner user={user} />
    </AppProviders>
  )
}
