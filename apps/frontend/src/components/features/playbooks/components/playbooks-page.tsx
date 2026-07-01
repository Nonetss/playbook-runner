import { BookText } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PlaybookList } from "@/components/features/playbooks/components/playbook-list"
import {
  usePlaybookDelete,
  usePlaybooksList,
} from "@/components/features/playbooks/hooks/usePlaybooks"
import type { Playbook } from "@/components/features/playbooks/types"
import { AppProviders } from "@/components/providers/app-providers"
import { ResourceListState } from "@/components/shared/resource-list-state"
import { ResourcePage } from "@/components/shared/resource-page"
import { useConfirm } from "@/hooks/useConfirm"
import { notifyError } from "@/lib/toast"

function PlaybooksPageInner() {
  const { t, i18n } = useTranslation("playbooks")
  const { t: tCommon } = useTranslation("common")
  const cardLocale = i18n.language?.startsWith("en") ? "en-US" : "es-ES"
  const {
    data: playbooks = [],
    isPending,
    isError,
    refetch,
  } = usePlaybooksList()
  const deletePlaybook = usePlaybookDelete()
  const confirm = useConfirm()

  function goToRun(playbook: Playbook) {
    window.location.href = `/playbooks/${playbook.id}/run`
  }

  function goToCreate() {
    window.location.href = "/playbooks/new"
  }

  function goToEdit(playbook: Playbook) {
    window.location.href = `/playbooks/${playbook.id}/edit`
  }

  async function handleDelete(id: string) {
    const playbook = playbooks.find((item) => item.id === id)
    const label = playbook?.name ?? tCommon("labels.this_playbook")
    const confirmed = await confirm({
      title: t("delete.confirm_title", { label }),
      description: t("delete.confirm_description"),
      confirmLabel: t("card.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })

    if (!confirmed) return

    try {
      await deletePlaybook.mutateAsync({ id })
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
      onCreate={goToCreate}
    >
      <ResourceListState
        isPending={isPending}
        isError={isError}
        onRetry={() => refetch()}
        items={playbooks}
        empty={{
          title: t("empty.title"),
          description: t("empty.description"),
          ctaLabel: t("page.create"),
          onCta: goToCreate,
          icon: <BookText className="size-5" />,
        }}
      >
        {(items) => (
          <PlaybookList
            playbooks={items}
            onEdit={goToEdit}
            onDelete={handleDelete}
            onRun={goToRun}
            locale={cardLocale}
            deletingId={
              deletePlaybook.isPending
                ? (deletePlaybook.variables?.id ?? null)
                : null
            }
          />
        )}
      </ResourceListState>
    </ResourcePage>
  )
}

export function PlaybooksPage() {
  return (
    <AppProviders>
      <PlaybooksPageInner />
    </AppProviders>
  )
}
