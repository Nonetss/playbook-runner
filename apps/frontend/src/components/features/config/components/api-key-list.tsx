import { ApiKeyCard } from "@/components/features/config/components/api-key-card"
import type { ApiKeyListItem } from "@/components/features/config/types"

type ApiKeyListProps = {
  apiKeys: ApiKeyListItem[]
  onDelete: (id: string) => void
  deletingId?: string | null
}

export function ApiKeyList({
  apiKeys,
  onDelete,
  deletingId = null,
}: ApiKeyListProps) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {apiKeys.map((apiKey) => (
        <ApiKeyCard
          key={apiKey.id}
          apiKey={apiKey}
          onDelete={onDelete}
          isDeleting={deletingId === apiKey.id}
        />
      ))}
    </div>
  )
}
