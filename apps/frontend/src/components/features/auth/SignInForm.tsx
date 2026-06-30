import { useState } from "react"
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

export function SignInForm() {
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
            window.location.href = "/"
          },
          onError: (ctx) => {
            setError(ctx.error.message || "No se pudo iniciar sesión.")
          },
        }
      )
    } catch {
      setError("Ha ocurrido un error inesperado.")
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
    } catch (ctx: unknown) {
      setError("SSO no disponible: configura GENERIC_OAUTH_* en el backend.")
      setOauthLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Accede con tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Iniciar sesión"}
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
          {oauthLoading ? "Redirigiendo..." : "Iniciar sesión con SSO"}
        </Button>
        <a
          href="/signup"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ¿No tienes cuenta? Regístrate
        </a>
      </CardFooter>
    </Card>
  )
}
