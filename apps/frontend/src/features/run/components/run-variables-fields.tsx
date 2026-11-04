import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
import { FormField } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InfisicalConnectionSelect,
  InfisicalEnvironmentField,
  InfisicalSecretPicker,
} from "@/features/infisical"
import {
  newVariableRow,
  type RunVariableRow,
  type SecretVariable,
  setDeclaredSecret,
  suggestVariableName,
  viewVariables,
} from "@/features/run/lib/run-variables"
import { cn } from "@/lib/utils"

export type DeclaredSecretVariables = {
  infisicalConnectionId: string | null
  infisicalEnvironment: string | null
  variables: SecretVariable[]
}

type InfisicalState = {
  declared?: DeclaredSecretVariables
  /** What this run sets: empty means the playbook's. */
  connectionId: string
  /** What this run sets: empty means the playbook's. */
  environment: string
  rows: RunVariableRow[]
  onRowsChange: (rows: RunVariableRow[]) => void
  disabled?: boolean
}

type InfisicalFieldsProps = InfisicalState & {
  idPrefix: string
  onConnectionChange: (value: string) => void
  onEnvironmentChange: (value: string) => void
}

export function effectiveInfisical({
  declared,
  connectionId,
  environment,
}: Pick<InfisicalState, "declared" | "connectionId" | "environment">) {
  return {
    effectiveConnection: connectionId || declared?.infisicalConnectionId || "",
    effectiveEnvironment: environment || declared?.infisicalEnvironment || "",
  }
}

/** The connection and environment, plus the variables, stacked in one block. */
export function RunVariablesFields(props: InfisicalFieldsProps) {
  const { t } = useTranslation("infisical")
  return (
    <div className="space-y-4">
      <RunInfisicalFields {...props} />
      <div className="space-y-2">
        <p className="text-sm">{t("variables.title")}</p>
        <RunVariableRows {...props} />
      </div>
    </div>
  )
}

/** The connection and environment a run or job reads its secrets from. */
export function RunInfisicalFields({
  idPrefix,
  declared,
  connectionId,
  onConnectionChange,
  environment,
  onEnvironmentChange,
  rows,
  onRowsChange,
  disabled,
}: InfisicalFieldsProps) {
  const { t } = useTranslation("infisical")
  const { effectiveConnection, effectiveEnvironment } = effectiveInfisical({
    declared,
    connectionId,
    environment,
  })

  return (
    <div className="space-y-4">
      <FormField
        label={t("variables.connection_label")}
        htmlFor={`${idPrefix}-connection`}
      >
        <InfisicalConnectionSelect
          id={`${idPrefix}-connection`}
          value={effectiveConnection}
          onChange={(next) => {
            onConnectionChange(next)
            // A slug belongs to a project, and without a connection there are
            // no secrets to point at.
            onEnvironmentChange("")
            if (!next && !declared?.infisicalConnectionId) {
              onRowsChange(rows.map((row) => ({ ...row, kind: "text" })))
            }
          }}
          allowNone={!declared?.infisicalConnectionId}
          disabled={disabled}
        />
      </FormField>

      {effectiveConnection ? (
        <FormField
          label={t("variables.environment_label")}
          htmlFor={`${idPrefix}-environment`}
        >
          <InfisicalEnvironmentField
            id={`${idPrefix}-environment`}
            connectionId={effectiveConnection}
            value={effectiveEnvironment}
            onChange={onEnvironmentChange}
            disabled={disabled}
          />
        </FormField>
      ) : null}
    </div>
  )
}

/** The playbook's variables and those this run or job adds. */
export function RunVariableRows({
  declared,
  connectionId,
  environment,
  rows,
  onRowsChange,
  disabled,
}: InfisicalState) {
  const { t } = useTranslation("infisical")
  const { effectiveConnection, effectiveEnvironment } = effectiveInfisical({
    declared,
    connectionId,
    environment,
  })
  const view = viewVariables(declared?.variables ?? [], rows)

  function updateRow(id: string, fields: Partial<RunVariableRow>) {
    onRowsChange(
      rows.map((row) => (row.id === id ? { ...row, ...fields } : row))
    )
  }

  return (
    <div className="space-y-2">
      {view.declared.map((variable, i) => (
        <DeclaredRow
          key={variable.name}
          variable={variable}
          index={i + 1}
          connectionId={effectiveConnection}
          environment={effectiveEnvironment}
          disabled={disabled}
          onChange={({ secretName, secretPath }) => {
            const original = declared?.variables.find(
              (item) => item.name === variable.name
            )
            if (original) {
              onRowsChange(
                setDeclaredSecret(rows, original, secretName, secretPath)
              )
            }
          }}
        />
      ))}

      {view.own.map((row, i) => {
        const index = view.declared.length + i + 1
        return (
          <div key={row.id} className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Input
                placeholder={t("variables.name_placeholder")}
                aria-label={t("variables.name_aria", { n: index })}
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
                disabled={disabled}
                className={cn(dataFieldClass, "h-9 min-w-0 flex-1")}
              />
              {effectiveConnection ? (
                <Select
                  value={row.kind}
                  onValueChange={(kind) => {
                    if (kind === "text" || kind === "secret") {
                      updateRow(row.id, { kind })
                    }
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={t("variables.kind_aria", { n: index })}
                    className="h-9 w-28 shrink-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      {t("variables.kind_text")}
                    </SelectItem>
                    <SelectItem value="secret">
                      {t("variables.kind_secret")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                aria-label={t("variables.remove_aria")}
                onClick={() =>
                  onRowsChange(rows.filter((item) => item.id !== row.id))
                }
                disabled={disabled}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            {row.kind === "secret" && effectiveConnection ? (
              <InfisicalSecretPicker
                connectionId={effectiveConnection}
                environment={effectiveEnvironment}
                secretName={row.secretName}
                secretPath={row.secretPath}
                index={index}
                disabled={disabled}
                onChange={({ secretName, secretPath }) =>
                  updateRow(row.id, {
                    secretName,
                    secretPath,
                    name: row.name || suggestVariableName(secretName),
                  })
                }
              />
            ) : (
              <Input
                placeholder={t("variables.value_placeholder")}
                aria-label={t("variables.value_aria", { n: index })}
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
                disabled={disabled}
                className={cn(dataFieldClass, "h-9 w-full")}
              />
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRowsChange([...rows, newVariableRow()])}
        disabled={disabled}
      >
        <Plus className="size-3.5" />
        {t("variables.add")}
      </Button>
    </div>
  )
}

function DeclaredRow({
  variable,
  index,
  connectionId,
  environment,
  onChange,
  disabled,
}: {
  variable: SecretVariable
  index: number
  connectionId: string
  environment: string
  onChange: (next: { secretName: string; secretPath: string }) => void
  disabled?: boolean
}) {
  const { t } = useTranslation("infisical")
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <Text variant="data" className="truncate">
          {variable.name}
        </Text>
        <Text variant="meta" tone="muted" className="shrink-0">
          {t("variables.from_playbook")}
        </Text>
      </div>
      <InfisicalSecretPicker
        connectionId={connectionId}
        environment={environment}
        secretName={variable.secretName}
        secretPath={variable.secretPath}
        index={index}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  )
}
