import { useState } from "react"
import { useTranslation } from "react-i18next"
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

export function SignUpForm() {
  const { t } = useTranslation("auth")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await authClient.signUp.email(
        { name, email, password },
        {
          onSuccess: () => {
            navigate("/")
          },
          onError: (ctx) => {
            setError(ctx.error.message || t("sign_up.errors.default"))
          },
        }
      )
    } catch {
      setError(t("sign_up.errors.unexpected"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{t("sign_up.title")}</CardTitle>
        <CardDescription>{t("sign_up.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("sign_up.name_label")}</Label>
            <Input
              id="name"
              type="text"
              required
              placeholder={t("sign_up.name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("sign_up.email_label")}</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder={t("sign_up.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("sign_up.password_label")}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder={t("sign_up.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("sign_up.password_hint")}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("sign_up.submitting") : t("sign_up.submit")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <a
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {t("sign_up.has_account_prompt")}
        </a>
      </CardFooter>
    </Card>
  )
}
