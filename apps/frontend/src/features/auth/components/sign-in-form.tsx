import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { textVariants } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuthConfig } from "@/features/auth/hooks/use-auth-config"
import { authClient } from "@/lib/auth-client"
import { navigate } from "@/lib/navigate"
import { getQueryClient } from "@/lib/query-client"

// The form is a standalone `client:only` island, so it must sit behind the i18n
// provider (which gates rendering until i18next is ready). Without it the form
// wins the race against the async global init and paints raw translation keys.
export function SignInForm({ locale }: { locale?: string }) {
  return (
    <AppProviders initialLocale={locale}>
      <SignInFormInner />
    </AppProviders>
  )
}

function SignInFormInner() {
  const { t } = useTranslation("auth")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const { data: authConfig } = useAuthConfig()

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authClient.signIn.email(
        { email, password },
        {
          onSuccess: () => {
            // Start the new session with an empty cache.
            getQueryClient().clear()
            navigate("/")
          },
          onError: (ctx) => {
            setError(ctx.error.message || t("sign_in.errors.default"))
          },
        }
      )
    } catch {
      setError(t("sign_in.errors.unexpected"))
    } finally {
      setLoading(false)
    }
  }

  async function handleSSOLogin() {
    setError("")
    setOauthLoading(true)
    try {
      await authClient.signIn.oauth2({
        providerId: "generic",
        callbackURL: "/",
      })
    } catch {
      setError(t("sign_in.sso_unavailable"))
      setOauthLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm gap-0 rounded-xl border-border bg-card py-0 shadow-none">
      <CardHeader className="gap-1.5 border-b px-6 py-5">
        <CardTitle className={textVariants({ role: "display" })}>
          {t("sign_in.title")}
        </CardTitle>
        <CardDescription className={textVariants({ role: "meta" })}>
          {t("sign_in.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label={t("sign_in.email_label")} htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t("sign_in.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField label={t("sign_in.password_label")} htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder={t("sign_in.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          {error ? <InlineAlert>{error}</InlineAlert> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("sign_in.submitting") : t("sign_in.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3 border-t px-6 py-5">
        {authConfig?.ssoEnabled ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSSOLogin}
            disabled={oauthLoading}
          >
            {oauthLoading
              ? t("sign_in.sso_redirecting")
              : t("sign_in.sso_button")}
          </Button>
        ) : null}
        <p className="text-center text-meta text-muted-foreground">
          {t("sign_in.no_account_hint")}
        </p>
      </CardFooter>
    </Card>
  )
}
