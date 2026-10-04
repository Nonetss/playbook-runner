/** Lowercases and strips diacritics, for accent-insensitive search matching. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}
