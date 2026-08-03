import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ScheduleMode =
  | "minutes"
  | "hours"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom"

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, value) => value)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, value) => value)
const WEEKDAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const
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
    <span className="text-muted-foreground/80 text-[0.625rem] font-medium tracking-[0.12em] uppercase">
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
  const [mode, setMode] = useState<ScheduleMode>(() => scheduleMode(expression))

  useEffect(() => {
    setMode(scheduleMode(expression))
  }, [expression])

  const [minute = "0", hour = "9", dayOfMonth = "1", dayOfWeek = "1"] =
    expression.split(" ")
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
          <p className="text-muted-foreground/80 text-[0.625rem] font-medium tracking-[0.12em] uppercase">
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
              <Select
                value={String(toNumber(hour, 9))}
                onValueChange={(value) => updateTime(minute, value)}
              >
                <SelectTrigger
                  aria-label={t("form.schedule_builder.hour_label")}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {String(value).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>{t("form.schedule_builder.minute_label")}</FieldLabel>
              <Select
                value={String(toNumber(minute, 0))}
                onValueChange={(value) => updateTime(value, hour)}
              >
                <SelectTrigger
                  aria-label={t("form.schedule_builder.minute_label")}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {String(value).padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {mode === "weekly" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <FieldLabel>{t("form.schedule_builder.weekday_label")}</FieldLabel>
            <Select
              value={dayOfWeek}
              onValueChange={(value) =>
                onChange(`${minute} ${hour} * * ${value}`)
              }
            >
              <SelectTrigger
                aria-label={t("form.schedule_builder.weekday_label")}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`form.schedule_builder.weekday.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {mode === "monthly" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <FieldLabel>{t("form.schedule_builder.monthday_label")}</FieldLabel>
            <Select
              value={dayOfMonth}
              onValueChange={(value) =>
                onChange(`${minute} ${hour} ${value} * *`)
              }
            >
              <SelectTrigger
                aria-label={t("form.schedule_builder.monthday_label")}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, index) => index + 1).map(
                  (value) => (
                    <SelectItem key={value} value={String(value)}>
                      {t("form.schedule_builder.monthday_option", {
                        day: value,
                      })}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
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
