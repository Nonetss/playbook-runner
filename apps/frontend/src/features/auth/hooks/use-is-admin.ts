import { authClient } from "@/lib/auth-client"

/** UI-only hint; the API enforces the admin role independently. */
export function useIsAdmin() {
  const { data: session } = authClient.useSession()
  return session?.user.role === "admin"
}
