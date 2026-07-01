import { ScriptCard } from "@/components/features/scripts/components/script-card"
import type { Script } from "@/components/features/scripts/types"

type ScriptListProps = {
  scripts: Script[]
  onEdit: (script: Script) => void
  onDelete: (id: string) => void
  onRun: (script: Script) => void
  deletingId?: string | null
}

export function ScriptList({
  scripts,
  onEdit,
  onDelete,
  onRun,
  deletingId = null,
}: ScriptListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {scripts.map((script) => (
        <ScriptCard
          key={script.id}
          script={script}
          onEdit={onEdit}
          onDelete={onDelete}
          onRun={onRun}
          isDeleting={deletingId === script.id}
        />
      ))}
    </div>
  )
}
