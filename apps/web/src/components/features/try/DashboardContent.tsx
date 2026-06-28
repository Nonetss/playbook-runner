import { useQuery } from "@tanstack/react-query"
import { QueryProvider } from "@/components/providers/query-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"

function DashboardContentInner() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  const { data, isPending, isError } = useQuery(orpc.privateData.queryOptions())

  const apiMessage = isPending
    ? "Loading..."
    : isError
      ? "Failed to load server data"
      : data?.message || "Connected to server"

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

export function DashboardContent() {
  return (
    <QueryProvider>
      <DashboardContentInner />
    </QueryProvider>
  )
}
