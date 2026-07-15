import { FileCode } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ScriptList } from "@/components/features/scripts/components/script-list"
import {
  useScriptDelete,
  useScriptsList,
} from "@/components/features/scripts/hooks/useScripts"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

function ScriptsPageInner() {
  const { t } = useTranslation("scripts")
  const { t: tCommon } = useTranslation("common")
  const { data: scripts = [], isPending, isError, refetch } = useScriptsList()
  const deleteScript = useScriptDelete()
  const confirm = useConfirm()

  async function handleDelete(id: string) {
    const script = scripts.find((item) => item.id === id)
    const label = script?.name ?? tCommon("labels.this_script")
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: t("card.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deleteScript.mutateAsync({ id })
    } catch (err) {
      notifyError(
        t("delete.error"),
        err instanceof Error ? err.message : undefined
      )
    }
  }

  return (
    <ResourcePage
      title={t("page.title")}
      description={t("page.subtitle")}
      createLabel={t("page.create")}
      createHref="/scripts/new"
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={scripts}
        empty={{
          title: t("empty.title"),
          description: t("empty.description"),
          ctaLabel: t("page.create"),
          ctaHref: "/scripts/new",
          icon: <FileCode className="size-5" />,
        }}
      >
        {(items) => (
          <ScriptList
            scripts={items}
            onDelete={handleDelete}
            locale={
              (typeof window === "undefined"
                ? "en"
                : navigator.language
              ).startsWith("en")
                ? "en-US"
                : "es-ES"
            }
            deletingId={
              deleteScript.isPending
                ? (deleteScript.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function ScriptsPage() {
  return (
    <AppProviders>
      <ScriptsPageInner />
    </AppProviders>
  )
}
