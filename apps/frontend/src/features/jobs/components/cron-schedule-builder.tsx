import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NumberStepper,
  SegmentedPicker,
} from "@/features/jobs/components/cron-schedule-controls"

type ScheduleMode =
  | "minutes"
  | "hours"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom"

const MINUTE_INTERVALS = [1, 5, 10, 15, 30]
const HOUR_INTERVALS = [1, 2, 3, 4, 6, 12]

function toNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

function scheduleMode(expression: string): ScheduleMode {
  if (/^\*\/\d+ \* \* \* \*$/.test(expression)) return "minutes"
  if (/^0 \*\/\d+ \* \* \*$/.test(expression)) return "hours"
  if (/^\d+ \d+ \* \* \*$/.test(expression)) return "daily"
  if (/^\d+ \d+ \* \* [0-6]$/.test(expression)) return "weekly"
  if (/^\d+ \d+ (?:[1-9]|[12]\d|3[01]) \* \*$/.test(expression)) {
    return "monthly"
  }
  return "custom"
}

function defaultExpression(mode: ScheduleMode) {
  switch (mode) {
    case "minutes":
      return "*/15 * * * *"
    case "hours":
      return "0 */2 * * *"
    case "weekly":
      return "0 9 * * 1"
    case "monthly":
      return "0 9 1 * *"
    case "custom":
      return "0 9 * * 1-5"
    default:
      return "0 9 * * *"
  }
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </span>
  )
}

/**
 * Visual builder for the six-field UTC cron expressions this app schedules
 * jobs with. Reverse-parses the current expression into a "mode" (minutes /
 * hours / daily / weekly / monthly / custom) so re-opening the dialog shows
 * the right controls instead of always falling back to raw-cron entry.
 */
export function CronScheduleBuilder({
  expression,
  onChange,
}: {
  expression: string
  onChange: (expression: string) => void
}) {
  const { t } = useTranslation("jobs")
  // The initial expression decides the mode when opening the assistant. From
  // there, the user's frequency choice remains stable while they edit time
  // fields. Re-parsing on every edit can incorrectly reset weekly to daily.
  const [mode, setMode] = useState<ScheduleMode>(() => scheduleMode(expression))

  const [minute = "0", hour = "9", dayOfMonth = "1", dayOfWeek = "1"] =
    expression.split(" ")
  const weekdays = ["1", "2", "3", "4", "5", "6", "0"].map((value) => ({
    value,
    label: t(`form.schedule_builder.weekday_short.${value}`),
    title: t(`form.schedule_builder.weekday.${value}`),
  }))
  const daysOfMonth = Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1)

    return {
      value: day,
      label: day,
      title: t("form.schedule_builder.monthday_option", { day }),
    }
  })
  const every =
    mode === "minutes"
      ? (expression.match(/^\*\/(\d+)/)?.[1] ?? "15")
      : (expression.match(/^0 \*\/(\d+)/)?.[1] ?? "2")

  const updateTime = (nextMinute: string, nextHour: string) => {
    switch (mode) {
      case "daily":
        onChange(`${nextMinute} ${nextHour} * * *`)
        break
      case "weekly":
        onChange(`${nextMinute} ${nextHour} * * ${dayOfWeek}`)
        break
      case "monthly":
        onChange(`${nextMinute} ${nextHour} ${dayOfMonth} * *`)
        break
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("form.schedule_builder.heading")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("form.schedule_builder.subtitle")}
          </p>
        </div>
        <code className="font-mono text-xs tracking-tight tabular-nums">
          {expression}
        </code>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel>{t("form.schedule_builder.frequency_label")}</FieldLabel>
          <Select
            value={mode}
            onValueChange={(value) => {
              const nextMode = value as ScheduleMode
              setMode(nextMode)
              onChange(defaultExpression(nextMode))
            }}
          >
            <SelectTrigger
              aria-label={t("form.schedule_builder.frequency_label")}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">
                {t("form.schedule_builder.frequency.minutes")}
              </SelectItem>
              <SelectItem value="hours">
                {t("form.schedule_builder.frequency.hours")}
              </SelectItem>
              <SelectItem value="daily">
                {t("form.schedule_builder.frequency.daily")}
              </SelectItem>
              <SelectItem value="weekly">
                {t("form.schedule_builder.frequency.weekly")}
              </SelectItem>
              <SelectItem value="monthly">
                {t("form.schedule_builder.frequency.monthly")}
              </SelectItem>
              <SelectItem value="custom">
                {t("form.schedule_builder.frequency.custom")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "minutes" || mode === "hours" ? (
          <div className="grid gap-1.5">
            <FieldLabel>{t("form.schedule_builder.interval_label")}</FieldLabel>
            <Select
              value={every}
              onValueChange={(value) =>
                onChange(
                  mode === "minutes"
                    ? `*/${value} * * * *`
                    : `0 */${value} * * *`
                )
              }
            >
              <SelectTrigger
                aria-label={t("form.schedule_builder.interval_label")}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(mode === "minutes" ? MINUTE_INTERVALS : HOUR_INTERVALS).map(
                  (value) => (
                    <SelectItem key={value} value={String(value)}>
                      {t(
                        mode === "minutes"
                          ? "form.schedule_builder.interval_minutes"
                          : "form.schedule_builder.interval_hours",
                        { count: value }
                      )}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {mode === "daily" || mode === "weekly" || mode === "monthly" ? (
          <>
            <div className="grid gap-1.5">
              <FieldLabel>{t("form.schedule_builder.hour_label")}</FieldLabel>
              <NumberStepper
                label={t("form.schedule_builder.hour_label")}
                min={0}
                max={23}
                value={toNumber(hour, 9)}
                onChange={(value) => updateTime(minute, String(value))}
                decreaseLabel={t("form.schedule_builder.stepper.decrease")}
                increaseLabel={t("form.schedule_builder.stepper.increase")}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>{t("form.schedule_builder.minute_label")}</FieldLabel>
              <NumberStepper
                label={t("form.schedule_builder.minute_label")}
                min={0}
                max={59}
                value={toNumber(minute, 0)}
                onChange={(value) => updateTime(String(value), hour)}
                decreaseLabel={t("form.schedule_builder.stepper.decrease")}
                increaseLabel={t("form.schedule_builder.stepper.increase")}
              />
            </div>
          </>
        ) : null}

        {mode === "weekly" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <FieldLabel>{t("form.schedule_builder.weekday_label")}</FieldLabel>
            <SegmentedPicker
              label={t("form.schedule_builder.weekday_label")}
              columns={7}
              options={weekdays}
              value={dayOfWeek}
              onChange={(value) => onChange(`${minute} ${hour} * * ${value}`)}
            />
          </div>
        ) : null}

        {mode === "monthly" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <FieldLabel>{t("form.schedule_builder.monthday_label")}</FieldLabel>
            <SegmentedPicker
              label={t("form.schedule_builder.monthday_label")}
              columns={7}
              mono
              options={daysOfMonth}
              value={dayOfMonth}
              onChange={(value) => onChange(`${minute} ${hour} ${value} * *`)}
            />
          </div>
        ) : null}

        {mode === "custom" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <FieldLabel>{t("form.schedule_builder.custom_label")}</FieldLabel>
            <Input
              aria-label={t("form.schedule_builder.custom_label")}
              required
              placeholder="*/5 * * * *"
              className="font-mono text-xs tracking-tight tabular-nums"
              value={expression}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
