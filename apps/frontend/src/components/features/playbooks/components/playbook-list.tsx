import { BookText, Plus } from "lucide-react"
import { PlaybookCard } from "@/components/features/playbooks/components/playbook-card"
import type { Playbook } from "@/components/features/playbooks/types"
import { Button } from "@/components/ui/button"

type PlaybookListProps = {
  playbooks: Playbook[]
  onCreate: () => void
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  deletingId?: string | null
}

export function PlaybookList({
  playbooks,
  onCreate,
  onEdit,
  onDelete,
  deletingId = null,
}: PlaybookListProps) {
  if (playbooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <BookText className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">Sin playbooks</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          Crea tu primer playbook para empezar a automatizar tus tareas.
        </p>
        <Button className="mt-6" onClick={onCreate}>
          <Plus className="size-4" />
          Nuevo playbook
        </Button>
      </div>
    )
  }

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