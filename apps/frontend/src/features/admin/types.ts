export const USER_ROLES = ["user", "admin", "pending"] as const
export type UserRole = (typeof USER_ROLES)[number]

export type AdminUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt: Date | string
}

export type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
}
