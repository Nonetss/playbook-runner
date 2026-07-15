import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
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
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { navigate } from "@/lib/navigate"

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

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authClient.signIn.email(
        { email, password },
        {
          onSuccess: () => {
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
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("sign_in.title")}</CardTitle>
        <CardDescription>{t("sign_in.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("sign_in.email_label")}</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder={t("sign_in.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("sign_in.password_label")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder={t("sign_in.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("sign_in.submitting") : t("sign_in.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          o
          <div className="h-px flex-1 bg-border" />
        </div>
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
        <a
          href="/signup"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {t("sign_in.no_account_prompt")}
        </a>
      </CardFooter>
    </Card>
  )
}
