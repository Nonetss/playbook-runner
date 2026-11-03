import { useTranslation } from "react-i18next"
import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

export const usePlaybookSecretVariables = (id: string) =>
  useHydratedQuery(
    orpc.playbooks.secretVariables.get.queryOptions({
      input: { id },
      enabled: !!id,
    })
  )

export const usePlaybookSecretVariablesSet = (id: string) => {
  const { t } = useTranslation("infisical")
  return useResourceMutation<
    {
      infisicalConnectionId: string | null
      infisicalEnvironment: string | null
      variables: { name: string; secretName: string; secretPath: string }[]
    },
    unknown
  >({
    mutationFn: (input) =>
      orpc.playbooks.secretVariables.set.call({ id, ...input }),
    listKey: orpc.playbooks.secretVariables.get.queryKey({ input: { id } }),
    messages: {
      success: t("declaration.saved"),
      error: t("declaration.save_error"),
    },
  })
}
