import { PlaybookCard } from "@/components/features/playbooks/components/playbook-card"
import { PlaybookFolderCard } from "@/components/features/playbooks/components/playbook-folder-card"
import type {
  Playbook,
  PlaybookFolder,
} from "@/components/features/playbooks/types"

type PlaybookListProps = {
  playbooks: Playbook[]
  folders?: PlaybookFolder[]
  allPlaybooks?: Playbook[]
  onOpenFolder: (folder: PlaybookFolder) => void
  onEditFolder: (folder: PlaybookFolder) => void
  onDeleteFolder: (folder: PlaybookFolder) => void
  onDropPlaybook: (folder: PlaybookFolder, playbookId: string) => void
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  onRun: (playbook: Playbook) => void
  onMove: (playbook: Playbook) => void
  deletingId?: string | null
  deletingFolderId?: string | null
  locale?: string
}

export function PlaybookList({
  playbooks,
  folders = [],
  allPlaybooks = playbooks,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder,
  onDropPlaybook,
  onEdit,
  onDelete,
  onRun,
  onMove,
  deletingId = null,
  deletingFolderId = null,
  locale,
}: PlaybookListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => (
        <PlaybookFolderCard
          key={folder.id}
          folder={folder}
          playbookCount={
            allPlaybooks.filter((playbook) => playbook.folderId === folder.id)
              .length
          }
          onOpen={onOpenFolder}
          onEdit={onEditFolder}
          onDelete={onDeleteFolder}
          onDropPlaybook={onDropPlaybook}
          isDeleting={deletingFolderId === folder.id}
        />
      ))}
      {playbooks.map((playbook) => (
        <PlaybookCard
          key={playbook.id}
          playbook={playbook}
          onEdit={onEdit}
          onDelete={onDelete}
          onRun={onRun}
          onMove={onMove}
          locale={locale}
          isDeleting={deletingId === playbook.id}
        />
      ))}
    </div>
  )
}
