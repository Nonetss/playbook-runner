import { getIcon } from "@/lib/icon-registry"

const Plus = getIcon("actions", "add")
const Trash2 = getIcon("actions", "delete")

import * as React from "react"
import { useTranslation } from "react-i18next"
import { dataFieldClass, Text } from "@/components/shared/brand/typography"
import { InlineAlert } from "@/components/shared/feedback/inline-alert"
import { FormField } from "@/components/shared/form/field-label"
import { FormDialog } from "@/components/shared/form/form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InfisicalConnectionSelect,
  InfisicalEnvironmentField,
  InfisicalSecretPicker,
} from "@/features/infisical"
import { useInfisicalConnectionsList } from "@/features/infisical/hooks/use-infisical-connections"
import {
  usePlaybookSecretVariables,
  usePlaybookSecretVariablesSet,
} from "@/features/playbooks/hooks/use-playbook-secret-variables"
import {
  newVariableRow,
  type RunVariableRow,
  suggestVariableName,
  toRunVariables,
} from "@/features/run/lib/run-variables"
import { cn } from "@/lib/utils"

/**
 * The secrets a playbook declares. They are stored apart from its content, so
 * this stays editable on Git playbooks, whose content is read-only.
 */
export function PlaybookSecretVariablesSection({
  playbookId,
}: {
  playbookId: string
}) {
  const { t } = useTranslation("infisical")
  const { data: declaration } = usePlaybookSecretVariables(playbookId)
  const { data: connections = [] } = useInfisicalConnectionsList()
  const [open, setOpen] = React.useState(false)

  const count = declaration?.variables.length ?? 0
  const connection = connections.find(
    (item) => item.id === declaration?.infisicalConnectionId
  )

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 px-4 py-3">
      <div className="min-w-0">
        <Text as="h2" variant="label" tone="muted">
          {t("declaration.title")}
        </Text>
        <Text as="p" variant="meta" tone="muted" className="mt-0.5">
          {count > 0 && connection
            ? t("declaration.summary", {
                count,
                connection: connection.name,
                environment: declaration?.infisicalEnvironment,
              })
            : t("declaration.empty")}
        </Text>
        {declaration?.variables.length ? (
          <ul className="mt-1 flex flex-wrap gap-x-3">
            {declaration.variables.map((variable) => (
              <li key={variable.name}>
                <Text variant="data">{variable.name}</Text>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("declaration.edit")}
      </Button>
      {declaration ? (
        <SecretVariablesDialog
          open={open}
          onOpenChange={setOpen}
          playbookId={playbookId}
          declaration={declaration}
        />
      ) : null}
    </section>
  )
}

function SecretVariablesDialog({
  open,
  onOpenChange,
  playbookId,
  declaration,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  playbookId: string
  declaration: {
    infisicalConnectionId: string | null
    infisicalEnvironment: string | null
    variables: { name: string; secretName: string; secretPath: string }[]
  }
}) {
  const { t } = useTranslation("infisical")
  const save = usePlaybookSecretVariablesSet(playbookId)
  const [connectionId, setConnectionId] = React.useState("")
  const [environment, setEnvironment] = React.useState("")
  const [rows, setRows] = React.useState<RunVariableRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
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
  }, [open, declaration])

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
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("declaration.save_error"))
    }
  }

  const canPickSecrets = !!connectionId && !!environment

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!save.isPending) onOpenChange(next)
      }}
      title={t("declaration.title")}
      description={t("declaration.description", {
        example: "{{ db_password }}",
      })}
      formId="playbook-secret-variables-form"
      onSubmit={handleSubmit}
      isPending={save.isPending}
      submitLabel={save.isPending ? t("form.saving") : t("declaration.save")}
      cancelLabel={t("form.cancel")}
      width="xl"
    >
      <FormField
        label={t("variables.connection_label")}
        htmlFor="playbook-secrets-connection"
        hint={connectionId ? undefined : t("declaration.no_connection_hint")}
      >
        <InfisicalConnectionSelect
          id="playbook-secrets-connection"
          value={connectionId}
          onChange={setConnectionId}
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
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
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
        </div>
      ) : null}

      {error ? <InlineAlert>{error}</InlineAlert> : null}
    </FormDialog>
  )
}
