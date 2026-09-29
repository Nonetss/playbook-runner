import * as React from "react"
import { useTranslation } from "react-i18next"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PLAYBOOK_ROOT_FOLDER_VALUE,
  toFolderId,
} from "@/features/playbooks/folder-id"
import { usePlaybookMove } from "@/features/playbooks/hooks/use-playbooks"
import type { Playbook, PlaybookFolder } from "@/features/playbooks/types"

type MovePlaybookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbook?: Playbook | null
  folders: PlaybookFolder[]
}

export function MovePlaybookDialog({
  open,
  onOpenChange,
  playbook = null,
  folders,
}: MovePlaybookDialogProps) {
  const { t } = useTranslation("playbooks")
  const movePlaybook = usePlaybookMove()
  const [destination, setDestination] = React.useState(
    PLAYBOOK_ROOT_FOLDER_VALUE
  )

  React.useEffect(() => {
    if (open) {
      setDestination(playbook?.folderId ?? PLAYBOOK_ROOT_FOLDER_VALUE)
    }
  }, [open, playbook?.folderId])

  async function handleMove(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!playbook) return
    try {
      await movePlaybook.mutateAsync({
        id: playbook.id,
        folderId: toFolderId(destination),
      })
      onOpenChange(false)
    } catch {
      // The shared mutation hook displays the localized error toast.
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("move.title")}
      description={t("move.description", { name: playbook?.name ?? "" })}
      onSubmit={handleMove}
      isPending={movePlaybook.isPending}
      cancelLabel={t("move.cancel")}
      submitLabel={
        movePlaybook.isPending ? t("move.moving") : t("move.confirm")
      }
      submitDisabled={
        !playbook ||
        destination === (playbook.folderId ?? PLAYBOOK_ROOT_FOLDER_VALUE)
      }
      width="md"
    >
      <FormField label={t("move.destination")} htmlFor="move-destination">
        <Select
          value={destination}
          onValueChange={(value) => {
            // Radix emits "" while folders are still loading; ignore it.
            if (value !== "") setDestination(value)
          }}
          disabled={movePlaybook.isPending}
        >
          <SelectTrigger id="move-destination" className="w-full">
            <SelectValue placeholder={t("move.destination")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={PLAYBOOK_ROOT_FOLDER_VALUE}>
                {t("folder.root")}
              </SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>
    </FormDialog>
  )
}
