import { KeyRound, Plus } from "lucide-react"
import { CredentialCard } from "@/components/features/credentials/components/credential-card"
import type { Credential } from "@/components/features/credentials/types"
import { Button } from "@/components/ui/button"

type CredentialListProps = {
  credentials: Credential[]
  onCreate: () => void
  onEdit: (credential: Credential) => void
  onDelete: (id: number) => void
  deletingId?: number | null
}

export function CredentialList({
  credentials,
  onCreate,
  onEdit,
  onDelete,
  deletingId = null,
}: CredentialListProps) {
  if (credentials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <KeyRound className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">Sin credenciales</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          Añade tu primera credencial SSH para conectar con tus servidores.
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          Nueva credencial
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
