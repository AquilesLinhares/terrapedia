// Busca de artigos com memória: o mesmo pedido serve para o pré-carregamento (mouse em cima de um link,
// sugestão escolhida na busca) e para abrir a página. Cada artigo que chega é salvo no aparelho.

import { fetchArticle, type ParsedArticle } from './wikiApi'
import { pageKey, savePage } from './pageCache'

// Um artigo pedido há menos de 5 minutos não é pedido de novo
const KEEP_MS = 5 * 60 * 1000
const recent = new Map<string, { at: number; promise: Promise<ParsedArticle> }>()

/** Artigo da wiki (reaproveita um pedido recente ou em andamento). */
export function getArticle(title: string): Promise<ParsedArticle> {
  const now = Date.now()
  for (const [key, entry] of recent) if (now - entry.at > KEEP_MS) recent.delete(key)

  const key = pageKey(title)
  const hit = recent.get(key)
  if (hit) return hit.promise
  const promise = fetchArticle(title).then((article) => {
    savePage(title, article)
    return article
  })
  promise.catch(() => recent.delete(key)) // erro não fica guardado: a próxima tentativa pede de novo
  recent.set(key, { at: now, promise })
  return promise
}

/** Começa a baixar um artigo antes do clique. Aceita "Título#Seção". */
export function prefetchArticle(page: string) {
  // "Economia de dados" ligada no celular: não baixa nada por conta própria
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
  const title = page.split('#')[0].replace(/_/g, ' ').trim()
  if (title) getArticle(title).catch(() => {})
}

/**
 * Pré-carrega o artigo de qualquer link "/wiki/..." do app: com o mouse, depois de um instante em cima
 * do link (para não baixar tudo por onde o mouse passa); no celular, assim que o dedo encosta.
 */
export function installLinkPrefetch() {
  let timer: ReturnType<typeof setTimeout> | undefined
  document.addEventListener('pointerover', (e) => {
    clearTimeout(timer)
    const href = (e.target as Element).closest?.('a[href^="/wiki/"]')?.getAttribute('href')
    if (!href) return
    const title = decodeURIComponent(href.slice('/wiki/'.length).split(/[?#]/)[0])
    if (e.pointerType === 'mouse') timer = setTimeout(() => prefetchArticle(title), 120)
    else prefetchArticle(title)
  })
  document.addEventListener('pointerout', () => clearTimeout(timer))
}
