import { CredentialCard } from "@/components/features/credentials/components/credential-card"
import type { Credential } from "@/components/features/credentials/types"

type CredentialListProps = {
  credentials: Credential[]
  onEdit: (credential: Credential) => void
  onDelete: (id: number) => void
  deletingId?: number | null
}

export function CredentialList({
  credentials,
  onEdit,
  onDelete,
  deletingId = null,
}: CredentialListProps) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {credentials.map((credential) => (
        <CredentialCard
          key={credential.id}
          credential={credential}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={deletingId === credential.id}
        />
      ))}
    </div>
  )
}
