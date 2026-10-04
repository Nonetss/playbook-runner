import { getIcon } from "@/lib/icon-registry"

const TerminalSquare = getIcon("resources", "terminalSquare")

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { dataFieldClass } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { SegmentedPicker } from "@/components/shared/form/segmented-picker"
import { PageHero } from "@/components/shared/layout/page-hero"
import { PageShell } from "@/components/shared/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import { useSelectableGroups } from "@/features/inventory/hooks/use-selectable-groups"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { RunButton } from "@/features/run/components/run-button"
import { RunHostConsole } from "@/features/run/components/run-host-console"
import {
  RunForksOption,
  RunSwitchOption,
} from "@/features/run/components/run-options"
import { RunResultBanner } from "@/features/run/components/run-result-banner"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  TerminalFrame,
  TerminalPanelSection,
} from "@/features/run/components/terminal-frame"
import {
  type CommandModule,
  type CommandRequest,
  useRunCommand,
} from "@/features/run/hooks/use-run-command"
import { toggleIn } from "@/features/run/hooks/use-selection-toggle"
import { toRunSelection } from "@/features/run/lib/run-selection"
import { useConfirm } from "@/hooks/use-confirm"
import { cn } from "@/lib/utils"

function CommandsPageInner() {
  const { t } = useTranslation("commands")
  const { data: storedGroups = [] } = useGroupsList()
  const { data: devices = [] } = useDevicesList()
  const groups = useSelectableGroups(storedGroups, devices)
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    useRunCommand()
  const confirm = useConfirm()

  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [command, setCommand] = useState("uptime")
  const [module, setModule] = useState<CommandModule>("shell")
  const [become, setBecome] = useState(false)
  const [forks, setForks] = useState(1)

  const selectionCount = selectedGroups.size + selectedDevices.size
  const trimmedCommand = command.trim()
  const canRun =
    trimmedCommand.length > 0 && selectionCount > 0 && phase !== "running"
  const isRunning = phase === "running"

  async function handleRun() {
    if (!canRun) return
    const inventory = toRunSelection(selectedGroups, selectedDevices)
    const body: CommandRequest = {
      inventory,
      command: trimmedCommand,
      module,
      become,
      forks,
    }

    const targetNames = [
      ...groups
        .filter((group) => selectedGroups.has(group.id))
        .map((g) => g.name),
      ...devices
        .filter((device) => selectedDevices.has(device.id))
        .map((d) => d.name),
    ]
    const targetSummary =
      targetNames.length > 4
        ? `${targetNames.slice(0, 4).join(", ")} +${targetNames.length - 4}`
        : targetNames.join(", ")
    const confirmed = await confirm({
      title: t("confirm.title"),
      description: t("confirm.description", {
        command: trimmedCommand,
        module,
        targets: targetSummary,
        count: selectionCount,
        forks,
        become: become ? t("confirm.with_sudo") : t("confirm.without_sudo"),
      }),
      confirmLabel: t("confirm.run"),
      cancelLabel: t("confirm.cancel"),
    })
    if (!confirmed) return

    void start(body)
  }

  const MODULES = [
    {
      value: "command" as const,
      label: t("module.command"),
      hint: t("module.command_hint"),
    },
    {
      value: "shell" as const,
      label: t("module.shell"),
      hint: t("module.shell_hint"),
    },
  ]
  const activeModule = MODULES.find((m) => m.value === module) ?? MODULES[0]

  return (
    <PageShell maxWidth="full">
      <PageHero
        surface="commands"
        action={
          phase !== "idle" ? (
            <Button variant="outline" onClick={reset} disabled={isRunning}>
              {t("actions.new_run")}
            </Button>
          ) : undefined
        }
      />

      <TerminalFrame
        setupFirst
        active={phase !== "idle"}
        context={module}
        privileged={become}
        command={trimmedCommand || "—"}
        banners={
          <>
            <RunStreamStatus
              phase={phase}
              errorMessage={errorMessage}
              onStopWatching={stopWatching}
              variant="terminal"
              labels={{
                connecting: t("run_status.connecting"),
                stopWatching: t("run_status.stop_watching"),
                stoppedWatching: t("run_status.stopped_watching"),
                serverMayStillBeRunning: t(
                  "run_status.server_may_still_be_running"
                ),
                connectionError: t("run_status.connection_error"),
              }}
            />
            {phase === "done" && result ? (
              <RunResultBanner
                result={result}
                message={t("result.finished_with_status", {
                  status: result.status,
                  rc: result.rc ?? "?",
                })}
              />
            ) : null}
          </>
        }
        panel={
          <>
            <TerminalPanelSection
              label={t("panel.inventory")}
              aside={
                selectionCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroups(new Set())
                      setSelectedDevices(new Set())
                    }}
                    disabled={isRunning}
                    className="text-meta text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {t("panel.clear", { count: selectionCount })}
                  </button>
                ) : null
              }
            >
              <InventorySelectionList
                groups={groups}
                devices={devices}
                selectedGroups={selectedGroups}
                selectedDevices={selectedDevices}
                onToggleGroup={toggleIn(setSelectedGroups)}
                onToggleDevice={toggleIn(setSelectedDevices)}
                labels={{
                  groups: t("panel.groups"),
                  devices: t("panel.devices"),
                  searchPlaceholder: t("panel.search_placeholder"),
                  noResults: t("panel.no_results"),
                  emptyInventory: t("panel.empty_inventory"),
                  noMatch: t("panel.no_match"),
                }}
                searchable
                collapsible
                disabled={isRunning}
              />
            </TerminalPanelSection>

            <TerminalPanelSection
              label={t("panel.command_section")}
              className="border-t pt-5"
            >
              <div>
                <label htmlFor="cmd-text" className="sr-only">
                  {t("panel.command")}
                </label>
                <div className="relative">
                  <span
                    className={cn(
                      dataFieldClass,
                      "pointer-events-none absolute top-2 left-3 text-muted-foreground select-none pointer-coarse:text-base"
                    )}
                  >
                    {become ? "#" : "$"}
                  </span>
                  <Textarea
                    id="cmd-text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    disabled={isRunning}
                    rows={3}
                    spellCheck={false}
                    className={cn(dataFieldClass, "min-h-20 pl-6")}
                    placeholder={t("panel.command_placeholder")}
                  />
                </div>
              </div>

              <FormField label={t("panel.module")} hint={activeModule.hint}>
                <SegmentedPicker
                  mono
                  ariaLabel={t("panel.module")}
                  value={module}
                  onChange={setModule}
                  disabled={isRunning}
                  options={MODULES.map((m) => ({
                    value: m.value,
                    label: m.label,
                    icon: <TerminalSquare />,
                  }))}
                />
              </FormField>

              <RunSwitchOption
                id="cmd-become"
                label={t("panel.become")}
                hint={t("panel.become_hint")}
                checked={become}
                onCheckedChange={setBecome}
                disabled={isRunning}
              />

              <RunForksOption
                id="cmd-forks"
                label={t("panel.forks")}
                value={forks}
                onChange={setForks}
                disabled={isRunning}
              />
            </TerminalPanelSection>
          </>
        }
        panelFooter={
          <RunButton
            running={isRunning}
            disabled={!canRun}
            selectionCount={selectionCount}
            label={t("actions.run")}
            runningLabel={t("actions.running")}
            onClick={handleRun}
          />
        }
      >
        <RunHostConsole
          phase={phase}
          events={events}
          idlePrompt={t("console.idle_prompt")}
        />
      </TerminalFrame>
    </PageShell>
  )
}

export function CommandsPage() {
  return (
    <AppProviders>
      <CommandsPageInner />
    </AppProviders>
  )
}
