import { PlaybookCard } from "@/components/features/playbooks/components/playbook-card"
import type { Playbook } from "@/components/features/playbooks/types"

type PlaybookListProps = {
  playbooks: Playbook[]
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  deletingId?: string | null
}

export function PlaybookList({
  playbooks,
  onEdit,
  onDelete,
  deletingId = null,
}: PlaybookListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {playbooks.map((playbook) => (
        <PlaybookCard
          key={playbook.id}
          playbook={playbook}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={deletingId === playbook.id}
        />
      ))}
    </div>
  )
}
