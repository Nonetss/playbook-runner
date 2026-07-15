import { useTranslation } from "react-i18next"
import type {
  PlaybookFolder,
  PlaybookFolderList,
} from "@/components/features/playbooks/types"
import { useHydratedQuery } from "@/hooks/useHydratedQuery"
import { useResourceMutation } from "@/hooks/useResourceMutation"
import { orpc } from "@/lib/orpc"

export function usePlaybookFoldersList() {
  return useHydratedQuery(orpc.playbooks.folders.list.queryOptions())
}

const folderListKey = orpc.playbooks.folders.list.queryKey()
const playbookListKey = orpc.playbooks.list.queryKey()

export function usePlaybookFolderCreate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    { name: string; description?: string },
    PlaybookFolder,
    PlaybookFolderList
  >({
    mutationFn: (input) =>
      orpc.playbooks.folders.create.call(input) as Promise<PlaybookFolder>,
    listKey: folderListKey,
    applyOptimistic: (current, input) => {
      if (!current) return current
      return [
        ...current,
        {
          id: `__optimistic_${Date.now()}`,
          name: input.name,
          description: input.description ?? null,
        } as PlaybookFolder,
      ]
    },
    messages: {
      success: t("folder.toast_created"),
      error: t("folder.toast_create_error"),
    },
  })
}

export function usePlaybookFolderUpdate() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    { id: string; name: string; description?: string },
    PlaybookFolder,
    PlaybookFolderList
  >({
    mutationFn: (input) =>
      orpc.playbooks.folders.update.call(input) as Promise<PlaybookFolder>,
    listKey: folderListKey,
    applyOptimistic: (current, input) =>
      current?.map((folder) =>
        folder.id === input.id
          ? {
              ...folder,
              name: input.name,
              description: input.description ?? null,
            }
          : folder
      ),
    messages: {
      success: t("folder.toast_updated"),
      error: t("folder.toast_update_error"),
    },
  })
}

export function usePlaybookFolderDelete() {
  const { t } = useTranslation("playbooks")
  return useResourceMutation<
    { id: string },
    PlaybookFolder,
    PlaybookFolderList
  >({
    mutationFn: (input) =>
      orpc.playbooks.folders.delete.call(input) as Promise<PlaybookFolder>,
    listKey: folderListKey,
    extraInvalidate: [playbookListKey],
    applyOptimistic: (current, input) =>
      current?.filter((folder) => folder.id !== input.id),
    messages: {
      success: t("folder.toast_deleted"),
      error: t("folder.toast_delete_error"),
    },
  })
}
