import type { AppRouterClient } from "@playbook-runner/api/v1/router"

export type InfisicalConnection = Awaited<
  ReturnType<AppRouterClient["infisicalConnections"]["list"]>
>[number]
