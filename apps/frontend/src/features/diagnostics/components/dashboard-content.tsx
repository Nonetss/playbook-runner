import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { authClient } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"

function DashboardContentInner() {
  const { t } = useTranslation("dashboard")
  const { data: session } = authClient.useSession()
  const user = session?.user

  const { data, isPending, isError } = useHydratedQuery(
    orpc.private.data.queryOptions()
  )

  const apiMessage = isPending
    ? t("diagnostics.loading")
    : isError
      ? t("diagnostics.load_error")
      : data?.message || t("diagnostics.connected_server")

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t("page.document_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {t("diagnostics.welcome_back")}
              </p>
              <p className="text-xl font-medium">
                {user?.name || t("diagnostics.user")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("diagnostics.email")}
              </p>
              <p className="text-xl font-medium">
                {user?.email || t("diagnostics.user")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("diagnostics.server_message")}
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
    <AppProviders>
      <DashboardContentInner />
    </AppProviders>
  )
}
