import { z } from "zod"

/**
 * Device and group names become Ansible inventory host/group names and
 * key-file prefixes on the runner, so keep them to a safe character set.
 */
export const inventoryName = z
  .string()
  .regex(
    /^[A-Za-z0-9._-]{1,64}$/,
    "Use 1-64 letters, digits, dots, underscores or hyphens"
  )
  .refine((name) => name !== "." && name !== "..", "Invalid name")

/**
 * `all` (any case) is the built-in All group, which targets every device,
 * so user groups can't take that name.
 */
export function isReservedGroupName(name: string): boolean {
  return name.toLowerCase() === "all"
}

export const reservedGroupNameMessage =
  '"all" is reserved for the built-in All group'

/** Group names: inventory names minus the reserved `all`. */
export const groupName = inventoryName.refine(
  (name) => !isReservedGroupName(name),
  reservedGroupNameMessage
)
