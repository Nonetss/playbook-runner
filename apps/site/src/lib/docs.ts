import { type CollectionEntry, getCollection } from "astro:content"
import type { Lang } from "@/i18n/ui"

export type Doc = CollectionEntry<"docs">

/** `en/configuration` → `configuration`; the index page (`en`) has none. */
export function docSlug(doc: Doc): string | undefined {
  const slug = doc.id.split("/").slice(1).join("/")
  return slug && slug !== "index" ? slug : undefined
}

export function docPath(doc: Doc): string {
  const slug = docSlug(doc)
  return slug ? `docs/${slug}/` : "docs/"
}

export async function docsFor(lang: Lang): Promise<Doc[]> {
  const docs = await getCollection(
    "docs",
    (doc) => doc.id === lang || doc.id.startsWith(`${lang}/`)
  )
  return docs.sort((a, b) => a.data.order - b.data.order)
}

export async function docPaths(lang: Lang) {
  const docs = await docsFor(lang)
  return docs.map((doc) => ({
    params: { slug: docSlug(doc) },
    props: { doc, docs },
  }))
}
