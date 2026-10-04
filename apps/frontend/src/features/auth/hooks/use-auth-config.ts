import { useHydratedQuery } from "@/hooks/use-hydrated-query"
import { orpc } from "@/lib/orpc"

/** Whether optional sign-in methods (e.g. SSO) are configured on the server. */
export function useAuthConfig() {
  return useHydratedQuery(orpc.authConfig.get.queryOptions())
}
