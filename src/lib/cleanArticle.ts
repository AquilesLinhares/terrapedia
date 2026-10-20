import DOMPurify from 'dompurify'
import { WIKI_BASE } from './wikiApi'

// Partes da página da wiki que não queremos mostrar no app.
const REMOVE_SELECTORS = [
  '.mw-editsection', // links "[edit]"
  '#toc, .toc', // índice (sumário) automático
  '.navbox, .ranger-navbox', // caixas de navegação gigantes no fim da página
  '.navigation-not-searchable',
  '.mw-collapsible-toggle-placeholder, .collapsible-toggle-wrapper',
  '.noprint, .printfooter, .catlinks',
  '.mw-empty-elt',
  'style, script, link, meta',
  '.reference-cell .mw-cite-backlink',
]

// Namespaces que não são artigos: esses links continuam abrindo no site da wiki.
const EXTERNAL_NAMESPACES = /^(File|Category|Special|Template|User|User talk|Talk|Help|Module|MediaWiki|Terraria Wiki|Property):/i

/** Converte um caminho de imagem relativo ("/images/x.png") em endereço completo. */
function absolutize(url: string) {
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${WIKI_BASE}${url}`
  return url
}

/**
 * Recebe o HTML cru da wiki e devolve um HTML limpo para o app:
 * - remove menus, navboxes e excessos
 * - conserta endereços de imagens
 * - marca links internos (com data-internal) para abrirem dentro do app
 */
export function cleanArticle(rawHtml: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const root = doc.body

  root.querySelectorAll(REMOVE_SELECTORS.join(',')).forEach((el) => el.remove())

  // Conteúdo recolhido ("mw-collapsed") fica aberto, porque o JS da wiki não roda aqui.
  root.querySelectorAll('.mw-collapsed').forEach((el) => el.classList.remove('mw-collapsed'))

  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src')
    if (src) img.setAttribute('src', absolutize(src))
    const srcset = img.getAttribute('srcset')
    if (srcset) {
      img.setAttribute(
        'srcset',
        srcset
          .split(',')
          .map((part) => {
            const [url, size] = part.trim().split(/\s+/)
            return size ? `${absolutize(url)} ${size}` : absolutize(url)
          })
          .join(', '),
      )
    }
    img.setAttribute('loading', 'lazy')
  })

  // Tabelas largas ganham uma "moldura" que rola para o lado no celular.
  root.querySelectorAll('table').forEach((table) => {
    if (table.closest('.infobox') || table.parentElement?.classList.contains('table-scroll')) return
    const wrapper = doc.createElement('div')
    wrapper.className = 'table-scroll'
    table.replaceWith(wrapper)
    wrapper.appendChild(table)
  })

  root.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href')
    if (!href) return
    if (href.startsWith('#')) return // âncora na mesma página

    if (href.startsWith('/wiki/') && !href.includes('?')) {
      const path = href.slice('/wiki/'.length)
      const [titlePart] = path.split('#')
      const title = decodeURIComponent(titlePart).replace(/_/g, ' ')
      if (!EXTERNAL_NAMESPACES.test(title)) {
        a.setAttribute('data-internal', 'true')
        return // "/wiki/..." no app é a mesma rota, então o href já serve
      }
    }

    // Qualquer outro link abre no site original, numa nova aba
    a.setAttribute('href', absolutize(href))
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
  })

  return DOMPurify.sanitize(root.innerHTML, { ADD_ATTR: ['target'] })
}
