import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InfisicalConnectionSelect,
  InfisicalEnvironmentField,
  InfisicalSecretPicker,
} from "@/features/infisical"
import {
  usePlaybookSecretVariables,
  usePlaybookSecretVariablesSet,
} from "@/features/playbooks/hooks/use-playbook-secret-variables"
import { usePlaybookGet } from "@/features/playbooks/hooks/use-playbooks"
import { usePlaybookRoles } from "@/features/playbooks/hooks/use-repositories"
import {
  type DetectedVariable,
  offeredVariables,
} from "@/features/playbooks/lib/playbook-roles"
import {
  newVariableRow,
  type RunVariableRow,
  suggestVariableName,
  toRunVariables,
} from "@/features/run/lib/run-variables"
import { cn } from "@/lib/utils"

type Declaration = {
  infisicalConnectionId: string | null
  infisicalEnvironment: string | null
  variables: { name: string; secretName: string; secretPath: string }[]
}

/**
 * The side panel with the secrets a playbook declares. They are stored apart
 * from its content, with their own save, so this stays editable on Git
 * playbooks, whose content is read-only.
 */
export function PlaybookSecretVariablesSection({
  playbookId,
}: {
  playbookId: string
}) {
  const { t } = useTranslation("infisical")
  const { data: declaration } = usePlaybookSecretVariables(playbookId)
  const { data: playbook } = usePlaybookGet(playbookId)
  const { variables: detected } = usePlaybookRoles(playbook)

  return (
    <aside
      aria-label={t("declaration.title")}
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border max-lg:split:max-h-[46dvh] lg:w-80"
    >
      {declaration ? (
        <SecretVariablesForm
          playbookId={playbookId}
          declaration={declaration}
          detected={detected}
        />
      ) : null}
    </aside>
  )
}

function SecretVariablesForm({
  playbookId,
  declaration,
  detected,
}: {
  playbookId: string
  declaration: Declaration
  detected: DetectedVariable[]
}) {
  const { t } = useTranslation("infisical")
  const save = usePlaybookSecretVariablesSet(playbookId)
  const [connectionId, setConnectionId] = React.useState("")
  const [environment, setEnvironment] = React.useState("")
  const [rows, setRows] = React.useState<RunVariableRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setConnectionId(declaration.infisicalConnectionId ?? "")
    setEnvironment(declaration.infisicalEnvironment ?? "")
    setRows(
      declaration.variables.map((variable) =>
        newVariableRow({
          name: variable.name,
          kind: "secret",
          secretName: variable.secretName,
          secretPath: variable.secretPath,
        })
      )
    )
    setError(null)
  }, [declaration])

  function updateRow(id: string, fields: Partial<RunVariableRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...fields } : row))
    )
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    const { secretVariables, incomplete } = toRunVariables(rows)
    if (connectionId && incomplete.length > 0) {
      setError(t("variables.incomplete", { names: incomplete.join(", ") }))
      return
    }
    try {
      await save.mutateAsync({
        infisicalConnectionId: connectionId || null,
        infisicalEnvironment: connectionId ? environment || null : null,
        variables: connectionId ? secretVariables : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("declaration.save_error"))
    }
  }

  const canPickSecrets = !!connectionId && !!environment
  const suggestions = offeredVariables(
    detected,
    new Set(),
    new Set(rows.map((row) => row.name.trim()))
  )
  // This form saves on its own, so leaving through the playbook's save would
  // lose its edits without this hint.
  const isDirty =
    connectionId !== (declaration.infisicalConnectionId ?? "") ||
    (connectionId !== "" &&
      environment !== (declaration.infisicalEnvironment ?? "")) ||
    JSON.stringify(
      rows.map(({ name, secretName, secretPath }) => ({
        name,
        secretName,
        secretPath,
      }))
    ) !== JSON.stringify(declaration.variables)

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="space-y-1">
          <Text as="h2" variant="label" tone="muted">
            {t("declaration.title")}
          </Text>
          <Text as="p" variant="meta" tone="muted">
            {t("declaration.description", { example: "{{ db_password }}" })}
          </Text>
        </div>

        <FormField
          label={t("variables.connection_label")}
          htmlFor="playbook-secrets-connection"
          hint={connectionId ? undefined : t("declaration.no_connection_hint")}
        >
          <InfisicalConnectionSelect
            id="playbook-secrets-connection"
            value={connectionId}
            onChange={(next) => {
              setConnectionId(next)
              // A slug belongs to a project.
              setEnvironment("")
            }}
            disabled={save.isPending}
          />
        </FormField>

        {connectionId ? (
          <FormField
            label={t("declaration.environment_label")}
            htmlFor="playbook-secrets-environment"
            hint={t("declaration.environment_hint")}
          >
            <InfisicalEnvironmentField
              id="playbook-secrets-environment"
              connectionId={connectionId}
              value={environment}
              onChange={setEnvironment}
              disabled={save.isPending}
            />
          </FormField>
        ) : null}

        {canPickSecrets ? (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.id} className="min-w-0 space-y-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Input
                    placeholder={t("variables.name_placeholder")}
                    aria-label={t("variables.name_aria", { n: i + 1 })}
                    value={row.name}
                    onChange={(e) =>
                      updateRow(row.id, { name: e.target.value })
                    }
                    disabled={save.isPending}
                    className={cn(dataFieldClass, "h-9 min-w-0 flex-1")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    aria-label={t("variables.remove_aria")}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((item) => item.id !== row.id)
                      )
                    }
                    disabled={save.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <InfisicalSecretPicker
                  connectionId={connectionId}
                  environment={environment}
                  secretName={row.secretName}
                  secretPath={row.secretPath}
                  index={i + 1}
                  disabled={save.isPending}
                  onChange={({ secretName, secretPath }) =>
                    updateRow(row.id, {
                      secretName,
                      secretPath,
                      name: row.name || suggestVariableName(secretName),
                    })
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  newVariableRow({ kind: "secret" }),
                ])
              }
              disabled={save.isPending}
            >
              <Plus className="size-3.5" />
              {t("variables.add")}
            </Button>
            {suggestions.length > 0 ? (
              <div className="space-y-1.5">
                <Text as="p" variant="meta" tone="muted">
                  {t("declaration.suggestions")}
                </Text>
                <ul className="flex flex-wrap gap-1.5">
                  {suggestions.map((variable) => (
                    <li key={variable.name} className="min-w-0 max-w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto max-w-full py-1 font-mono text-xs"
                        title={t("declaration.suggestion_aria", {
                          name: variable.name,
                        })}
                        aria-label={t("declaration.suggestion_aria", {
                          name: variable.name,
                        })}
                        onClick={() =>
                          setRows((current) => [
                            ...current,
                            newVariableRow({
                              name: variable.name,
                              kind: "secret",
                            }),
                          ])
                        }
                        disabled={save.isPending}
                      >
                        <Plus className="size-3 shrink-0" />
                        <span className="truncate">{variable.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <InlineAlert>{error}</InlineAlert> : null}
      </div>

      <div className="shrink-0 space-y-2 border-t p-4">
        {isDirty ? (
          <Text as="p" variant="meta" tone="muted">
            {t("declaration.unsaved")}
          </Text>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={save.isPending || !isDirty}
        >
          {save.isPending ? t("form.saving") : t("declaration.save")}
        </Button>
      </div>
    </form>
  )
}
