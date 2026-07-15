import * as React from "react"
import { useTranslation } from "react-i18next"
import { usePlaybookMove } from "@/components/features/playbooks/hooks/usePlaybooks"
import type {
  Playbook,
  PlaybookFolder,
} from "@/components/features/playbooks/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROOT_VALUE = "__root__"

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
  const [destination, setDestination] = React.useState(ROOT_VALUE)

  React.useEffect(() => {
    if (open) setDestination(playbook?.folderId ?? ROOT_VALUE)
  }, [open, playbook?.folderId])

  async function handleMove() {
    if (!playbook) return
    await movePlaybook.mutateAsync({
      id: playbook.id,
      folderId: destination === ROOT_VALUE ? null : destination,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("move.title")}</DialogTitle>
          <DialogDescription>
            {t("move.description", { name: playbook?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        <Select
          value={destination}
          onValueChange={setDestination}
          disabled={movePlaybook.isPending}
        >
          <SelectTrigger className="w-full" aria-label={t("move.destination")}>
            <SelectValue placeholder={t("move.destination")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ROOT_VALUE}>{t("folder.root")}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={movePlaybook.isPending}
          >
            {t("move.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleMove}
            disabled={
              movePlaybook.isPending ||
              !playbook ||
              destination === (playbook.folderId ?? ROOT_VALUE)
            }
          >
            {movePlaybook.isPending ? t("move.moving") : t("move.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
