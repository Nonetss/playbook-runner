import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

export function ApiStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking")

  useEffect(() => {
    orpc
      .healthCheck()
      .then(() => setStatus("connected"))
      .catch(() => setStatus("disconnected"))
  }, [])

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
