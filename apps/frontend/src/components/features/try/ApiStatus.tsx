import { useQuery } from "@tanstack/react-query"
import { QueryProvider } from "@/components/providers/query-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

function ApiStatusContent({ className }: { className?: string }) {
  const { isPending, isError } = useQuery(
    orpc.healthCheck.queryOptions({
      retry: false,
    })
  )

  const status = isPending ? "checking" : isError ? "disconnected" : "connected"

  const dot =
    status === "connected"
      ? "bg-green-500"
      : status === "disconnected"
        ? "bg-red-500"
        : "bg-orange-400"

  const label =
    status === "connected"
      ? "Connected"
      : status === "disconnected"
        ? "Disconnected"
        : "Checking..."

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="text-base font-medium">API Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-md ${dot}`} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ApiStatus({ className }: { className?: string }) {
  return (
    <QueryProvider>
      <ApiStatusContent className={className} />
    </QueryProvider>
  )
}
