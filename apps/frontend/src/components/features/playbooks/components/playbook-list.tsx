import { PlaybookCard } from "@/components/features/playbooks/components/playbook-card"
import type { Playbook } from "@/components/features/playbooks/types"

type PlaybookListProps = {
  playbooks: Playbook[]
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  onRun: (playbook: Playbook) => void
  deletingId?: string | null
}

export function PlaybookList({
  playbooks,
  onEdit,
  onDelete,
  onRun,
  deletingId = null,
}: PlaybookListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {playbooks.map((playbook) => (
        <PlaybookCard
          key={playbook.id}
          playbook={playbook}
          onEdit={onEdit}
          onDelete={onDelete}
          onRun={onRun}
          isDeleting={deletingId === playbook.id}
        />
      ))}
    </div>
  )
}
