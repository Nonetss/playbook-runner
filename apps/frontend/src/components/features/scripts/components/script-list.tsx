import { ScriptCard } from "@/components/features/scripts/components/script-card"
import type { Script } from "@/components/features/scripts/types"

type ScriptListProps = {
  scripts: Script[]
  onDelete: (id: string) => void
  deletingId?: string | null
  locale?: string
}

export function ScriptList({
  scripts,
  onDelete,
  deletingId = null,
  locale,
}: ScriptListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {scripts.map((script) => (
        <ScriptCard
          key={script.id}
          script={script}
          onDelete={onDelete}
          locale={locale}
          isDeleting={deletingId === script.id}
        />
      ))}
    </div>
  )
}
