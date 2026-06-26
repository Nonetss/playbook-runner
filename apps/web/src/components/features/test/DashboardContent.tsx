import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"

export function DashboardContent() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null
  )
  const [apiMessage, setApiMessage] = useState("Loading...")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const { data: session } = await authClient.getSession()

        if (!session?.user) {
          window.location.href = "/login"
          return
        }

        setUser(session.user)

        try {
          const data = await orpc.privateData()
          setApiMessage(data.message || "Connected to server")
        } catch {
          setApiMessage("Failed to load server data")
        }
      } catch {
        window.location.href = "/login"
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

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
              <p>{user?.email}</p>
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
