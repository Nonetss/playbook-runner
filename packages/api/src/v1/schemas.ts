import { z } from "zod"

/** Every `id` / `*Id` input: malformed values fail validation (BAD_REQUEST). */
export const idSchema = z.uuid()
