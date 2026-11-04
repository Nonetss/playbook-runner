/** Lowercases and strips diacritics, for accent-insensitive search matching. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/**
 * Whether every word of the query is a substring of one of the folded texts,
 * so "db prod" finds `PROD_DB_PASSWORD`. An empty query matches everything.
 */
export function matchesEveryWord(search: string, texts: string[]): boolean {
  const words = foldText(search).split(/\s+/).filter(Boolean)
  const folded = texts.map(foldText)
  return words.every((word) => folded.some((text) => text.includes(word)))
}
