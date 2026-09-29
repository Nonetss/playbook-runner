import { getIcon } from "@/lib/icon-registry"

const FileCode2 = getIcon("resources", "fileCode")
const Plus = getIcon("actions", "add")

import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { EntityCardGrid } from "@/components/shared/resource/entity-list"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { scriptDefinition } from "@/features/scripts/definitions/script.definition"
import {
  useScriptDelete,
  useScriptsList,
} from "@/features/scripts/hooks/use-scripts"
import type { Script } from "@/features/scripts/types"
import { useConfirm } from "@/hooks/use-confirm"

function ScriptsPageInner() {
  const { t, i18n } = useTranslation("scripts")
  const { t: tCommon } = useTranslation("common")
  const query = useScriptsList()
  const deleteScript = useScriptDelete()
  const confirm = useConfirm()

  async function handleDelete(script: Script) {
    const confirmed = await confirm({
      title: t("delete.confirm_title", {
        label: script.name || tCommon("labels.this_script"),
      }),
      description: t("delete.confirm_description"),
      confirmLabel: t("card.delete"),
      cancelLabel: tCommon("actions.cancel"),
      variant: "destructive",
    })
    if (!confirmed) return
    // The mutation hook shows the error toast.
    deleteScript.mutate({ id: script.id })
  }

  const createButton = (
    <Button asChild>
      <AppLink href="/scripts/new">
        <Plus className="size-4" />
        {t("page.create")}
      </AppLink>
    </Button>
  )

  return (
    <ResourceOverview
      surface="scripts"
      heroMeta={
        <HeroCount
          segments={[
            { count: query.data?.length ?? 0, label: tCommon("labels.total") },
          ]}
        />
      }
      heroAction={createButton}
      query={query}
      isEmpty={(scripts) => scripts.length === 0}
      empty={{
        icon: <FileCode2 />,
        title: t("empty.title"),
        description: t("empty.description"),
        action: createButton,
      }}
    >
      {(scripts) => (
        <EntityCardGrid
          items={scripts}
          definition={scriptDefinition}
          context={{
            t,
            language: i18n.language,
            deletingId: deleteScript.isPending
              ? (deleteScript.variables?.id ?? null)
              : null,
            onDelete: handleDelete,
          }}
        />
      )}
    </ResourceOverview>
  )
}

export function ScriptsPage() {
  return (
    <AppProviders>
      <ScriptsPageInner />
    </AppProviders>
  )
}
