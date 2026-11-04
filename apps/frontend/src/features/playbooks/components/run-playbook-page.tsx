import { getIcon } from "@/lib/icon-registry"

const Pencil = getIcon("actions", "edit")

import type * as React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AppProviders } from "@/components/providers/app-providers"
import { Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { StateCard } from "@/components/shared/feedback/state-card"
import { DetailFrame } from "@/components/shared/layout/detail-frame"
import { PageHero } from "@/components/shared/layout/page-hero"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { useInfisicalConnectionsList } from "@/features/infisical/hooks/use-infisical-connections"
import { useDevicesList } from "@/features/inventory/hooks/use-devices"
import { useGroupsList } from "@/features/inventory/hooks/use-groups"
import { useSelectableGroups } from "@/features/inventory/hooks/use-selectable-groups"
import { PlaybookSwitcher } from "@/features/playbooks/components/playbook-switcher"
import { RunDetectedVariables } from "@/features/playbooks/components/run-detected-variables"
import { RunRolesSelection } from "@/features/playbooks/components/run-roles-selection"
import { usePlaybookSecretVariables } from "@/features/playbooks/hooks/use-playbook-secret-variables"
import { usePlaybookGet } from "@/features/playbooks/hooks/use-playbooks"
import { usePlaybookRoles } from "@/features/playbooks/hooks/use-repositories"
import { offeredVariables } from "@/features/playbooks/lib/playbook-roles"
import { InventorySelectionList } from "@/features/run/components/inventory-selection-list"
import { PlaybookRunConsole } from "@/features/run/components/playbook-run-console"
import { RunButton } from "@/features/run/components/run-button"
import { RunForksOption } from "@/features/run/components/run-options"
import { RunResultBanner } from "@/features/run/components/run-result-banner"
import { RunStreamStatus } from "@/features/run/components/run-stream-status"
import {
  effectiveInfisical,
  RunInfisicalFields,
  RunVariableRows,
} from "@/features/run/components/run-variables-fields"
import {
  TerminalBanner,
  TerminalFrame,
  TerminalPanelCollapsible,
  TerminalPanelSection,
} from "@/features/run/components/terminal-frame"
import { useRunInventorySelection } from "@/features/run/hooks/use-run-inventory-selection"
import { useRunPlaybook } from "@/features/run/hooks/use-run-playbook"
import { toggleIn } from "@/features/run/hooks/use-selection-toggle"
import { toRunSelection } from "@/features/run/lib/run-selection"
import {
  newVariableRow,
  type RunVariableRow,
  toRunVariables,
  viewVariables,
} from "@/features/run/lib/run-variables"
import { useConfirm } from "@/hooks/use-confirm"

// ── RunPlaybookPageInner ──────────────────────────────────────────────────────

function RunPlaybookPageInner({ id }: { id: string }) {
  const { t } = useTranslation("playbooks")
  const { t: tInfisical } = useTranslation("infisical")
  const { data: playbook, isPending: playbookLoading } = usePlaybookGet(id)
  const { data: declaredVariables } = usePlaybookSecretVariables(id)
  const { roles, variables: detectedVariables } = usePlaybookRoles(playbook)
  const { data: infisicalConnections } = useInfisicalConnectionsList()
  const { data: storedGroups = [], isPending: groupsLoading } = useGroupsList()
  const { data: devices = [], isPending: devicesLoading } = useDevicesList()
  const groups = useSelectableGroups(storedGroups, devices)
  const { phase, events, result, errorMessage, start, stopWatching, reset } =
    useRunPlaybook()
  const confirm = useConfirm()

  const inventoryReady = !groupsLoading && !devicesLoading
  const {
    selectedGroups,
    setSelectedGroups,
    selectedDevices,
    setSelectedDevices,
  } = useRunInventorySelection({
    groups,
    devices,
    ready: inventoryReady,
  })
  const [forks, setForks] = useState(1)
  const [variableRows, setVariableRows] = useState<RunVariableRow[]>([])
  const [infisicalConnectionId, setInfisicalConnectionId] = useState("")
  const [infisicalEnvironment, setInfisicalEnvironment] = useState("")
  const [variablesError, setVariablesError] = useState<string | null>(null)
  const [uncheckedRoles, setUncheckedRoles] = useState<ReadonlySet<string>>(
    new Set()
  )
  // Of the run on screen: the checkboxes can change once it has finished.
  const [runDisabledRoles, setRunDisabledRoles] = useState<string[]>([])

  const selectionCount = selectedGroups.size + selectedDevices.size
  const isRunning = phase === "running"

  async function handleRun() {
    if (!playbook || selectionCount === 0) return
    const inventory = toRunSelection(selectedGroups, selectedDevices)
    const variables = toRunVariables(variableRows)
    setVariablesError(
      variables.incomplete.length > 0
        ? tInfisical("variables.incomplete", {
            names: variables.incomplete.join(", "),
          })
        : null
    )
    if (variables.incomplete.length > 0) return

    const disabledRoles = roles
      .map((role) => role.name)
      .filter((name) => uncheckedRoles.has(name))

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
      title: t("run.confirm_title", { name: playbook.name }),
      description: [
        t("run.confirm_description", {
          targets: targetSummary,
          count: selectionCount,
          forks,
          variables:
            Object.keys(variables.extravars).length +
            variables.secretVariables.length +
            (declaredVariables?.variables.length ?? 0),
        }),
        ...(disabledRoles.length > 0
          ? [t("run.roles_disabled", { names: disabledRoles.join(", ") })]
          : []),
      ].join(" "),
      confirmLabel: t("run.confirm_run"),
      cancelLabel: t("run.cancel"),
    })
    if (!confirmed) return

    setRunDisabledRoles(disabledRoles)
    start(playbook.id, inventory, {
      disabledRoles,
      forks,
      extravars: variables.extravars,
      secretVariables: variables.secretVariables,
      infisicalConnectionId: infisicalConnectionId || undefined,
      infisicalEnvironment: infisicalEnvironment || undefined,
    })
  }

  const variableView = viewVariables(
    declaredVariables?.variables ?? [],
    variableRows
  )
  const variableCount = variableView.declared.length + variableView.own.length
  const takenVariableNames = new Set([
    ...variableView.declared.map((variable) => variable.name),
    ...variableView.own.map((row) => row.name.trim()),
  ])
  const offeredCount = offeredVariables(
    detectedVariables,
    uncheckedRoles,
    new Set()
  ).length
  const hasUndefinedVariable = offeredVariables(
    detectedVariables,
    uncheckedRoles,
    takenVariableNames
  ).some((variable) => variable.usedOnly)
  const variableSummary = [
    offeredCount > 0 ? offeredCount : null,
    variableCount > 0
      ? t("run.panel.variables_assigned", { count: variableCount })
      : null,
  ]
    .filter((part) => part !== null)
    .join(" · ")

  const { effectiveConnection, effectiveEnvironment } = effectiveInfisical({
    declared: declaredVariables,
    connectionId: infisicalConnectionId,
    environment: infisicalEnvironment,
  })
  const infisicalSummary = effectiveConnection
    ? [
        infisicalConnections?.find(
          (connection) => connection.id === effectiveConnection
        )?.name,
        effectiveEnvironment,
      ]
        .filter(Boolean)
        .join(" · ")
    : tInfisical("select.none")

  const frame = (children: React.ReactNode) => (
    <DetailFrame
      backHref="/playbooks"
      backLabel={t("form.back_to_playbooks")}
      maxWidth="full"
    >
      {children}
    </DetailFrame>
  )

  if (playbookLoading)
    return frame(<StateCard spinner title={t("form.loading")} />)
  if (!playbook) {
    return frame(
      <StateCard tone="destructive" title={t("run.playbook_not_found")} />
    )
  }

  return frame(
    <>
      <PageHero
        surface="playbooks"
        title={playbook.name}
        description={t("run.header_subtitle")}
        action={
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            {/* Fixed width, so the header doesn't move with the name's length. */}
            <div className="min-w-0 flex-1 sm:w-80 sm:flex-none">
              <PlaybookSwitcher currentId={id} disabled={isRunning} />
            </div>
            <Button asChild variant="outline" size="icon-sm">
              <AppLink
                href={`/playbooks/${id}/edit`}
                aria-label={t("run.edit_aria")}
                title={t("run.edit_aria")}
              >
                <Pencil className="size-4" />
              </AppLink>
            </Button>
            {phase !== "idle" ? (
              <Button variant="outline" onClick={reset} disabled={isRunning}>
                {t("run.new_run")}
              </Button>
            ) : null}
          </div>
        }
      />

      <TerminalFrame
        setupFirst
        active={phase !== "idle"}
        context="playbook"
        command={playbook.name}
        banners={
          <>
            {phase !== "idle" && runDisabledRoles.length > 0 ? (
              <TerminalBanner>
                {t("run.roles_disabled", {
                  names: runDisabledRoles.join(", "),
                })}
              </TerminalBanner>
            ) : null}
            <RunStreamStatus
              phase={phase}
              errorMessage={errorMessage}
              onStopWatching={stopWatching}
              variant="terminal"
              labels={{
                connecting: t("run.connecting"),
                stopWatching: t("run.stop_watching"),
                stoppedWatching: t("run.stopped_watching"),
                serverMayStillBeRunning: t("run.server_may_still_be_running"),
                connectionError: t("run.connection_error"),
              }}
            />
            {phase === "done" && result ? (
              <RunResultBanner
                result={result}
                message={t("run.result_finished_with_status", {
                  status: result.status,
                  rc: result.rc ?? "?",
                })}
              />
            ) : null}
          </>
        }
        panel={
          <>
            <TerminalPanelCollapsible
              label={t("run.panel.inventory")}
              aside={<PanelCount count={selectionCount} />}
            >
              <InventorySelectionList
                groups={groups}
                devices={devices}
                selectedGroups={selectedGroups}
                selectedDevices={selectedDevices}
                onToggleGroup={toggleIn(setSelectedGroups)}
                onToggleDevice={toggleIn(setSelectedDevices)}
                labels={{
                  groups: t("run.panel.groups"),
                  devices: t("run.panel.devices"),
                  searchPlaceholder: t("run.panel.search_placeholder"),
                  noResults: t("run.panel.no_results"),
                  emptyInventory: t("run.panel.empty_inventory"),
                  noMatch: t("run.panel.no_match"),
                }}
                searchable
                collapsible
                disabled={isRunning}
              />
            </TerminalPanelCollapsible>

            <RunRolesSelection
              roles={roles}
              unchecked={uncheckedRoles}
              onChange={setUncheckedRoles}
              disabled={isRunning}
            />

            <TerminalPanelCollapsible
              label={tInfisical("variables.section")}
              aside={<PanelSummary>{infisicalSummary}</PanelSummary>}
              defaultOpen={false}
              // Without an environment its secrets cannot be read.
              openWhen={!!effectiveConnection && !effectiveEnvironment}
              className="border-t pt-5"
            >
              <RunInfisicalFields
                idPrefix="run"
                declared={declaredVariables}
                connectionId={infisicalConnectionId}
                onConnectionChange={setInfisicalConnectionId}
                environment={infisicalEnvironment}
                onEnvironmentChange={setInfisicalEnvironment}
                rows={variableRows}
                onRowsChange={setVariableRows}
                disabled={isRunning}
              />
            </TerminalPanelCollapsible>

            <TerminalPanelCollapsible
              label={tInfisical("variables.title")}
              aside={<PanelSummary>{variableSummary}</PanelSummary>}
              defaultOpen={false}
              openWhen={variableView.own.length > 0 || hasUndefinedVariable}
              className="border-t pt-5"
            >
              <RunDetectedVariables
                variables={detectedVariables}
                uncheckedRoles={uncheckedRoles}
                takenNames={takenVariableNames}
                onOverride={(variable) =>
                  setVariableRows([
                    ...variableRows,
                    newVariableRow({
                      name: variable.name,
                      value: variable.value ?? "",
                    }),
                  ])
                }
                disabled={isRunning}
              />
              <RunVariableRows
                declared={declaredVariables}
                connectionId={infisicalConnectionId}
                environment={infisicalEnvironment}
                rows={variableRows}
                onRowsChange={setVariableRows}
                disabled={isRunning}
              />
            </TerminalPanelCollapsible>

            <TerminalPanelSection
              label={t("run.panel.options")}
              className="border-t pt-5"
            >
              <RunForksOption
                id="run-forks"
                label={t("run.panel.forks")}
                value={forks}
                onChange={setForks}
                disabled={isRunning}
              />
            </TerminalPanelSection>

            {/* Outside the block: a folded one must not hide why a run stopped. */}
            {variablesError ? (
              <InlineAlert>{variablesError}</InlineAlert>
            ) : null}
          </>
        }
        panelFooter={
          <RunButton
            running={isRunning}
            disabled={isRunning || selectionCount === 0}
            selectionCount={selectionCount}
            label={t("run.run_button")}
            runningLabel={t("run.running")}
            onClick={handleRun}
          />
        }
      >
        <PlaybookRunConsole
          events={events}
          running={isRunning}
          idlePrompt={t("run.idle_prompt")}
        />
      </TerminalFrame>
    </>
  )
}

export function RunPlaybookPage({ id }: { id?: string }) {
  const { t } = useTranslation("playbooks")
  if (!id) {
    return (
      <AppProviders>
        <StateCard tone="destructive" title={t("run.playbook_not_found")} />
      </AppProviders>
    )
  }
  return (
    <AppProviders>
      <RunPlaybookPageInner id={id} />
    </AppProviders>
  )
}

/** What a block holds, in one line, so it can stay folded. */
function PanelSummary({ children }: { children: string }) {
  return children ? (
    <Text
      variant="meta"
      tone="muted"
      title={children}
      className="min-w-0 max-w-[60%] truncate"
    >
      {children}
    </Text>
  ) : null
}

function PanelCount({ count }: { count: number }) {
  return count > 0 ? (
    <Text variant="data" tone="muted">
      {count}
    </Text>
  ) : null
}
