import { z } from "zod"

/** How an override of a detected variable has to travel to keep its type. */
export const variableValueType = z.enum(["text", "boolean", "number", "json"])

export type VariableValueType = z.infer<typeof variableValueType>

/** What the runner reports; anything unknown can always travel as text. */
export function toVariableValueType(raw: string): VariableValueType {
  const parsed = variableValueType.safeParse(raw)
  return parsed.success ? parsed.data : "text"
}
