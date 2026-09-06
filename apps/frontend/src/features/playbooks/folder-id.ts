/** Radix Select cannot use `value=""`, so the root option uses this sentinel. */
export const PLAYBOOK_ROOT_FOLDER_VALUE = "__root__"

/** Maps a select/form value to the API's nullable folder id. */
export function toFolderId(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (
    trimmed === "" ||
    trimmed === PLAYBOOK_ROOT_FOLDER_VALUE ||
    trimmed === "__none__"
  ) {
    return null
  }
  return trimmed
}
