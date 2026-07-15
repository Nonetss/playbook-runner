import { PlaybookCard } from "@/components/features/playbooks/components/playbook-card"
import { PlaybookFolderCard } from "@/components/features/playbooks/components/playbook-folder-card"
import type {
  Playbook,
  PlaybookFolder,
} from "@/components/features/playbooks/types"

type PlaybookListProps = {
  playbooks: Playbook[]
  folders?: PlaybookFolder[]
  allFolders?: PlaybookFolder[]
  allPlaybooks?: Playbook[]
  onEditFolder: (folder: PlaybookFolder) => void
  onDeleteFolder: (folder: PlaybookFolder) => void
  onDropPlaybook: (folder: PlaybookFolder, playbookId: string) => void
  onDelete: (id: string) => void
  onMove: (playbook: Playbook) => void
  deletingId?: string | null
  deletingFolderId?: string | null
  locale?: string
}

export function PlaybookList({
  playbooks,
  folders = [],
  allFolders = folders,
  allPlaybooks = playbooks,
  onEditFolder,
  onDeleteFolder,
  onDropPlaybook,
  onDelete,
  onMove,
  deletingId = null,
  deletingFolderId = null,
  locale,
}: PlaybookListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => {
        const folderPlaybooks = allPlaybooks.filter(
          (playbook) => playbook.folderId === folder.id
        )
        return (
          <PlaybookFolderCard
            key={folder.id}
            folder={folder}
            playbooks={folderPlaybooks}
            onEdit={onEditFolder}
            onDelete={onDeleteFolder}
            onDropPlaybook={onDropPlaybook}
            isDeleting={deletingFolderId === folder.id}
          />
        )
      })}
      {playbooks.map((playbook) => (
        <PlaybookCard
          key={playbook.id}
          playbook={playbook}
          folderName={
            allFolders.find((folder) => folder.id === playbook.folderId)?.name
          }
          onDelete={onDelete}
          onMove={onMove}
          locale={locale}
          isDeleting={deletingId === playbook.id}
        />
      ))}
    </div>
  )
}
