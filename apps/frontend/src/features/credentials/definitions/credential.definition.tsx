import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")
const Terminal = getIcon("resources", "terminal")
const Trash2 = getIcon("actions", "delete")

import type { TFunction } from "i18next"
import { Text } from "@/components/shared/brand/typography"
import type { EntityListDefinition } from "@/components/shared/resource/entity-list"
import type { Credential } from "@/features/credentials/types"
import { formatDate } from "@/lib/format"

export interface CredentialRowContext {
  t: TFunction<"credentials">
  tCommon: TFunction<"common">
  language: string
  deletingId: string | null
  onEdit: (credential: Credential) => void
  onDelete: (credential: Credential) => void
  onProvision: (credential: Credential) => void
}

/** Key algorithm from an OpenSSH public key line (e.g. `ssh-ed25519`). */
function keyType(publicKey: string) {
  return publicKey.trim().split(/\s+/)[0] || "—"
}

export const credentialDefinition: EntityListDefinition<
  Credential,
  CredentialRowContext
> = {
  getKey: (credential) => credential.id,
  getPrimary: (credential) => credential.name,
  getSecondary: (credential) => (
    <span className="font-mono">{credential.username}</span>
  ),
  onOpen: (credential, { onEdit }) => onEdit(credential),
  isMuted: (credential, { deletingId }) => deletingId === credential.id,
  metadata: [
    {
      key: "key",
      label: ({ t }) => t("card.key_type"),
      value: (credential) => (
        <Text variant="data" title={credential.publicKey}>
          {keyType(credential.publicKey)}
        </Text>
      ),
    },
    {
      key: "created",
      label: ({ t }) => t("card.created_label"),
      value: (credential, { language }) => (
        <Text variant="data" tone="muted">
          {formatDate(credential.createdAt, language)}
        </Text>
      ),
    },
  ],
  actions: [
    {
      key: "edit",
      label: (_, { tCommon }) => tCommon("actions.edit"),
      icon: Pencil,
      onSelect: (credential, { onEdit }) => onEdit(credential),
    },
    {
      key: "provision",
      label: (_, { tCommon }) => tCommon("actions.provision_script"),
      icon: Terminal,
      onSelect: (credential, { onProvision }) => onProvision(credential),
    },
    {
      key: "delete",
      label: (_, { tCommon }) => tCommon("actions.delete"),
      icon: Trash2,
      destructive: true,
      disabled: (credential, { deletingId }) => deletingId === credential.id,
      onSelect: (credential, { onDelete }) => onDelete(credential),
    },
  ],
}
