import { getIcon } from "@/lib/icon-registry"

const KeyRound = getIcon("resources", "apiKey")
const Pencil = getIcon("actions", "edit")
const Terminal = getIcon("resources", "terminal")
const Trash2 = getIcon("actions", "delete")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ResourceCard } from "@/components/shared/data-display/resource-card"
import { RowActionsMenu } from "@/components/shared/data-display/row-actions-menu"
import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ProvisionScriptDialog } from "@/features/credentials/components/provision-script-dialog"
import type { Credential } from "@/features/credentials/types"

type CredentialCardProps = {
  credential: Credential
  onEdit: (credential: Credential) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function CredentialCard({
  credential,
  onEdit,
  onDelete,
  isDeleting = false,
}: CredentialCardProps) {
  const { t } = useTranslation("common")
  const { t: tCredentials } = useTranslation("credentials")
  const [scriptOpen, setScriptOpen] = useState(false)
  const createdAt = credential.createdAt
    ? new Date(credential.createdAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <ResourceCard
      className="min-w-0 overflow-hidden"
      icon={<KeyRound className="size-4" />}
      title={credential.name}
      description={credential.username}
      contentClassName="min-w-0 space-y-3 overflow-hidden"
      actions={
        <RowActionsMenu
          label={tCredentials("card.actions_for", { name: credential.name })}
          disabled={isDeleting}
        >
          <DropdownMenuItem onClick={() => onEdit(credential)}>
            <Pencil className="size-4" />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setScriptOpen(true)}>
            <Terminal className="size-4" />
            {t("actions.provision_script")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(credential.id)}
          >
            <Trash2 className="size-4" />
            {t("actions.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          SSH
        </Badge>
        {createdAt && (
          <span className="text-muted-foreground text-xs">
            {tCredentials("card.created_on", { date: createdAt })}
          </span>
        )}
      </div>

      <p
        className="text-muted-foreground line-clamp-3 min-w-0 break-all font-mono text-xs sm:line-clamp-1 sm:truncate"
        title={credential.publicKey}
      >
        {credential.publicKey}
      </p>

      <ProvisionScriptDialog
        open={scriptOpen}
        onOpenChange={setScriptOpen}
        credential={credential}
      />
    </ResourceCard>
  )
}
