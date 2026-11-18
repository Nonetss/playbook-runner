import { getIcon } from "@/lib/icon-registry"

const Role = getIcon("resources", "role")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/shared/brand/typography"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import type { PlaybookRepositoryRoles } from "@/features/playbooks/types"

type RoleDetails = PlaybookRepositoryRoles["roles"][number]

/**
 * The roles a playbook declares, behind a button on its own card. The list
 * opens in a dialog so the card stays two lines: each role shows its name,
 * path and description as the repository defines them, read-only.
 */
export function PlaybookRolesButton({
  playbookName,
  names,
  dynamic,
  details,
}: {
  playbookName: string
  /** Roles the playbook names, in the order it declares them. */
  names: string[]
  /** It also pulls in roles whose name is only known when it runs. */
  dynamic: boolean
  /** The repository's roles by name; a role missing from it shows its name. */
  details?: ReadonlyMap<string, RoleDetails>
}) {
  const { t } = useTranslation("playbooks")
  const { t: tCommon } = useTranslation("common")
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen(true)}
      >
        <Role aria-hidden />
        {t("repository.roles_heading")}
        <span className="text-muted-foreground tabular-nums">
          {names.length > 0 ? names.length : t("repository.roles_dynamic")}
        </span>
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        width="lg"
        title={t("repository.roles_dialog_title", { name: playbookName })}
        description={t("repository.roles_dialog_description")}
        cancelLabel={tCommon("actions.close")}
      >
        {names.length > 0 ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card/40">
            {names.map((name) => {
              const role = details?.get(name)
              return (
                <li key={name} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                    <Text variant="data" className="font-bold">
                      {name}
                    </Text>
                    {role ? (
                      <Text variant="data" tone="muted" className="break-all">
                        {role.path}
                      </Text>
                    ) : null}
                  </div>
                  {role?.description ? (
                    <Text as="p" variant="meta" tone="muted">
                      {role.description}
                    </Text>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {dynamic ? (
          <Text as="p" variant="meta" tone="muted">
            {t("repository.roles_dynamic_note")}
          </Text>
        ) : null}
      </FormDialog>
    </>
  )
}
