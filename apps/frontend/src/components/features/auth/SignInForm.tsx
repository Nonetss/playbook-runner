import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

export function SignInForm() {
  const handleSSOLogin = async () => {
    await authClient.signIn.oauth2({
      providerId: "generic",
      callbackURL: "/",
    })
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Accede con tu cuenta corporativa</CardDescription>
      </CardHeader>
      <Button className="w-full" onClick={handleSSOLogin}>
        Iniciar sesión con SSO
      </Button>
    </Card>
  )
}
