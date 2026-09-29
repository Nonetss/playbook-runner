import { getIcon } from "@/lib/icon-registry"

const CalendarClock = getIcon("scheduling", "schedule")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import { CronScheduleBuilder } from "@/features/jobs/components/cron-schedule-builder"

/**
 * "Asistente" entry point next to the raw cron-expression input: opens a
 * dialog with `CronScheduleBuilder`, editing a local draft so cancelling
 * never touches the form's real value.
 *
 * The dialog renders inside the job form's React tree, so it deliberately
 * uses `FormDialog` without `onSubmit`: a nested `<form>` submit would
 * bubble through the portal into the job form.
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
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
      >
        <CalendarClock className="size-4" />
        {t("form.schedule_builder.trigger")}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={handleOpenChange}
        width="xl"
        title={t("form.schedule_builder.dialog_title")}
        description={t("form.schedule_builder.dialog_description")}
        cancelLabel={tCommon("actions.cancel")}
        footer={
          <>
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
          </>
        }
      >
        <CronScheduleBuilder expression={draft} onChange={setDraft} />
      </FormDialog>
    </>
  )
}
