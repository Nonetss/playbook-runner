import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { orpc } from "@/lib/orpc"
import { cn } from "@/lib/utils"

function ApiStatusInner({ className }: { className?: string }) {
  const { t } = useTranslation("dashboard")
  const { isPending, isError } = useHydratedQuery(
    orpc.health.check.queryOptions({
      retry: false,
    })
  )

  const status = isPending ? "checking" : isError ? "disconnected" : "connected"

  const dot =
    status === "connected"
      ? "bg-foreground"
      : status === "disconnected"
        ? "bg-destructive"
        : "bg-primary"

  const label =
    status === "connected"
      ? t("diagnostics.connected")
      : status === "disconnected"
        ? t("diagnostics.disconnected")
        : t("diagnostics.checking")

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          {t("diagnostics.api_status")}
        </CardTitle>
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

export function ApiStatus(props: { className?: string }) {
  return (
    <AppProviders>
      <ApiStatusInner {...props} />
    </AppProviders>
  )
}
