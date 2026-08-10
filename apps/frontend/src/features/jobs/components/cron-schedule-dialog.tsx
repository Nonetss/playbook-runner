import { getIcon } from "@/lib/icon-registry"

const CalendarClock = getIcon("scheduling", "schedule")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CronScheduleBuilder } from "@/features/jobs/components/cron-schedule-builder"

/**
 * "Asistente" entry point next to the raw cron-expression input: opens a
 * dialog with `CronScheduleBuilder`, editing a local draft so cancelling
 * never touches the form's real value.
 */
export function CronScheduleDialog({
  expression,
  onApply,
  disabled,
}: {
  expression: string
  onApply: (expression: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation("jobs")
  const { t: tCommon } = useTranslation("common")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(expression)

  function handleOpenChange(next: boolean) {
    if (next) setDraft(expression || "0 9 * * *")
    setOpen(next)
  }

  function handleApply() {
    onApply(draft)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <CalendarClock className="size-4" />
          {t("form.schedule_builder.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("form.schedule_builder.dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("form.schedule_builder.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <CronScheduleBuilder expression={draft} onChange={setDraft} />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button type="button" onClick={handleApply}>
            {t("form.schedule_builder.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
