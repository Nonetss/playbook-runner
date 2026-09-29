import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type {
  AdminUser,
  CreateUserInput,
  UserRole,
} from "@/features/admin/types"
import { authClient } from "@/lib/auth-client"
import { notifyError, notifySuccess } from "@/lib/toast"

const usersKey = ["admin", "users"] as const

// Better Auth client calls resolve to `{ data, error }` instead of throwing.
function unwrap<T>(result: {
  data: T | null
  error: { message?: string } | null
}) {
  if (result.error) throw new Error(result.error.message ?? "Request failed")
  return result.data as T
}

export function useAdminUsersList() {
  return useQuery({
    queryKey: usersKey,
    queryFn: async () => {
      const data = unwrap(
        await authClient.admin.listUsers({
          query: { limit: 500, sortBy: "createdAt", sortDirection: "asc" },
        })
      )
      return data.users as AdminUser[]
    },
  })
}

function useUsersMutation<TInput>(
  mutationFn: (input: TInput) => Promise<unknown>,
  messages: { success: string; error: string }
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => notifySuccess(messages.success),
    onError: (err) =>
      notifyError(
        messages.error,
        err instanceof Error ? err.message : undefined
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  })
}

export function useAdminUserCreate() {
  const { t } = useTranslation("account")
  return useUsersMutation(
    async (input: CreateUserInput) =>
      unwrap(
        await authClient.admin.createUser({
          ...input,
          // `pending` is a custom role; the server accepts any role string.
          role: input.role as "user" | "admin",
        })
      ),
    {
      success: t("admin_users.toast.created"),
      error: t("admin_users.toast.error"),
    }
  )
}

export function useAdminUserSetRole() {
  const { t } = useTranslation("account")
  return useUsersMutation(
    async ({ userId, role }: { userId: string; role: UserRole }) =>
      unwrap(
        await authClient.admin.setRole({
          userId,
          role: role as "user" | "admin",
        })
      ),
    {
      success: t("admin_users.toast.updated"),
      error: t("admin_users.toast.error"),
    }
  )
}

export function useAdminUserSetBanned() {
  const { t } = useTranslation("account")
  return useUsersMutation(
    async ({ userId, banned }: { userId: string; banned: boolean }) =>
      unwrap(
        banned
          ? await authClient.admin.banUser({ userId })
          : await authClient.admin.unbanUser({ userId })
      ),
    {
      success: t("admin_users.toast.updated"),
      error: t("admin_users.toast.error"),
    }
  )
}
