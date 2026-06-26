import type { User } from "better-auth/types"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"

export function DashboardContent() {
  const [apiMessage, setApiMessage] = useState("Loading...")
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Esta es la forma de obtener la session del usuario desde el cliente
    authClient.getSession().then(({ data: session }) => {
      setUser(session?.user || null)
    })
    orpc
      .privateData()
      .then((data: { message: string }) =>
        setApiMessage(data.message || "Connected to server")
      )
      .catch(() => setApiMessage("Failed to load server data"))
  }, [])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <p className="text-xl font-medium">{user?.name || "User"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-xl font-medium">{user?.email || "User"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">
                Server Message
              </p>
              <p>{apiMessage}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </main>
  )
}
