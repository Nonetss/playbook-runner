import { z } from "zod"

/**
 * User-supplied extra vars. Extra vars have the highest precedence in
 * Ansible, so `ansible_*` keys (connection, become, ssh args...) could change
 * how and where the runner connects. They are reserved for the runner.
 */
export const safeExtravars = z.record(
  z
    .string()
    .regex(
      /^(?!ansible_)[a-z_][a-z0-9_]*$/i,
      "Extra var names must be identifiers and must not start with `ansible_`"
    ),
  z.string()
)
