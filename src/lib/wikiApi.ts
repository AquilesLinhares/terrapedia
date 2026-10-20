// Funções que conversam com a API pública da Terraria Wiki (MediaWiki).
// `origin=*` libera o acesso direto pelo navegador (CORS), sem precisar de servidor.

export const WIKI_BASE = 'https://terraria.wiki.gg'
const API_URL = `${WIKI_BASE}/api.php`

function apiUrl(params: Record<string, string>) {
  const search = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  return `${API_URL}?${search}`
}

/** Endereço da página original na wiki (usado nos créditos). */
export function wikiPageUrl(title: string) {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export interface Suggestion {
  title: string
  thumbnail?: string
}

// Páginas traduzidas da wiki terminam com "/ja", "/pt", "/zh-hans"... Elas não interessam aqui.
const LANGUAGE_SUBPAGE = /\/[a-z]{2}(-[a-z]+)?$/

/** Sugestões enquanto o usuário digita (busca por começo do título, com miniatura). */
export async function fetchSuggestions(query: string, signal?: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch(
    apiUrl({
      action: 'query',
      generator: 'prefixsearch',
      gpssearch: query,
      gpsnamespace: '0',
      gpslimit: '15',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '48',
      redirects: '1',
    }),
    { signal },
  )
  const data = await res.json()
  const pages: { title: string; index: number; thumbnail?: { source: string } }[] = data.query?.pages ?? []
  return pages
    .filter((p) => !LANGUAGE_SUBPAGE.test(p.title))
    .sort((a, b) => a.index - b.index)
    .slice(0, 8)
    .map((p) => ({ title: p.title, thumbnail: p.thumbnail?.source }))
}

export interface SearchResult {
  title: string
  snippet: string
}

/** Busca no texto completo (usada quando a página digitada não existe). */
export async function fetchSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(
    apiUrl({ action: 'query', list: 'search', srsearch: query, srnamespace: '0', srlimit: '20' }),
    { signal },
  )
  const data = await res.json()
  const results: SearchResult[] = data.query?.search ?? []
  return results.filter((r) => !LANGUAGE_SUBPAGE.test(r.title))
}

export interface ParsedArticle {
  title: string
  html: string
}

export class PageNotFoundError extends Error {}

/** Busca o HTML já renderizado de um artigo. Segue redirecionamentos automaticamente. */
export async function fetchArticle(title: string, signal?: AbortSignal): Promise<ParsedArticle> {
  const res = await fetch(
    apiUrl({ action: 'parse', page: title, prop: 'text', redirects: '1', disableeditsection: '1', disabletoc: '1' }),
    { signal },
  )
  const data = await res.json()
  if (data.error) {
    if (data.error.code === 'missingtitle' || data.error.code === 'invalidtitle') throw new PageNotFoundError(title)
    throw new Error(data.error.info ?? 'Erro ao carregar a página')
  }
  return { title: data.parse.title, html: data.parse.text }
}
