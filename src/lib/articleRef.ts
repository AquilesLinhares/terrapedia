import { infoboxImage } from './cleanArticle'
import type { ArticleRef } from './library'
import { ptNameForPage } from './ptSearch'
import { fetchPageImage } from './wikiApi'

/**
 * Junta o que precisamos para salvar um artigo: nome PT (dicionário) e sprite.
 * O sprite vem da ficha do artigo; se não tiver ficha, pede a imagem principal à wiki.
 */
export async function fetchArticleRef(title: string, cleanHtml: string, signal?: AbortSignal): Promise<ArticleRef> {
  const [pt, sprite] = await Promise.all([
    ptNameForPage(title).catch(() => undefined),
    infoboxImage(cleanHtml) ?? fetchPageImage(title, signal).catch(() => undefined),
  ])
  return { page: title, en: title, pt, sprite }
}
