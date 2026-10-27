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
    // Só baixa quando chega perto da tela; a largura/altura que a wiki manda reservam o espaço
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
  })
  // A imagem da ficha aparece logo no topo: essa vem primeiro
  const infoboxImg = root.querySelector('.infobox img')
  infoboxImg?.setAttribute('loading', 'eager')
  infoboxImg?.setAttribute('fetchpriority', 'high')

  // Tabelas largas ganham uma "moldura" que rola para o lado no celular.
  root.querySelectorAll('table').forEach((table) => {
    if (table.closest('.infobox') || table.parentElement?.classList.contains('table-scroll')) return
    const wrapper = doc.createElement('div')
    wrapper.className = 'table-scroll'
    table.replaceWith(wrapper)
    wrapper.appendChild(table)
  })

  markCraftingSection(doc)
  fixModeValues(doc)

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

  return DOMPurify.sanitize(root.innerHTML, { ADD_ATTR: ['target', 'loading', 'decoding', 'fetchpriority'] })
}

/**
 * Valores que mudam por modo (Clássico / Expert / Mestre). Na wiki cada um fica num `<span class="m-normal|m-expert|m-master">`
 * e o CSS/JS dela mostra um por vez; aqui não há nada disso, então os três saíam colados ("60120180").
 * Viram "60 · 120 · 180" (um só, se todos iguais). As abas de modo, que não funcionam sem o JS da wiki, viram uma legenda.
 */
function fixModeValues(doc: Document) {
  const MODES = ['normal', 'expert', 'master'] as const
  const NAMES = ['Classic', 'Expert', 'Master']
  doc.querySelectorAll('.mode-content, .npcstat').forEach((box) => {
    const vals: (string | null)[] = [null, null, null]
    const src: (Element | null)[] = [null, null, null] // conteúdo original (mantém links, moedas e notas)
    let all: Element | null = null
    for (const child of Array.from(box.children)) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (!text || child.classList.contains('ssep')) continue
      const cls = child.classList
      if (cls.contains('m-all') || cls.contains('m-normal-expert-master')) all = child
      else if (cls.contains('m-expert-master')) [1, 2].forEach((i) => ((vals[i] = text), (src[i] = child)))
      else MODES.forEach((m, i) => cls.contains(`m-${m}`) && ((vals[i] = text), (src[i] = child)))
    }
    const filled = vals.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0)
    if (all === null && filled.length === 0) return // formato desconhecido: deixa como veio
    const out = doc.createElement('span')
    out.className = 'mode-vals'
    const distinct = new Set(filled.map((i) => vals[i]))
    if (all !== null || distinct.size === 1) {
      out.append(...Array.from((all ?? src[filled[0]])!.cloneNode(true).childNodes))
    } else {
      filled.forEach((i, n) => {
        if (n) out.append(' · ')
        const s = doc.createElement('span')
        s.className = `mv mv-${MODES[i]}`
        s.append(...Array.from(src[i]!.cloneNode(true).childNodes))
        out.append(s)
      })
      // Só alguns modos têm valor próprio: diz quais, para não confundir
      if (filled.length < 3) {
        const tag = doc.createElement('small')
        tag.className = 'mode-tag'
        tag.textContent = ` (${filled.map((i) => NAMES[i]).join(' · ')})`
        out.append(tag)
      }
    }
    box.replaceWith(out)
  })
  doc.querySelectorAll('.infobox .modetabs').forEach((tabs) => {
    const legend = doc.createElement('div')
    legend.className = 'mode-legend'
    legend.innerHTML =
      '<span>Values by mode</span>: <span class="mv mv-normal">Classic</span> · <span class="mv mv-expert">Expert</span> · <span class="mv mv-master">Master</span>'
    tabs.replaceWith(legend)
  })
}

// ---------- Modo limpo ----------

// Seções (h2) que saem por completo
const DROP_SECTIONS = /^(history|gallery|achievements|trivia|references|footnotes|sounds|version history|contents)$/i
// Seções que ficam sempre abertas
const OPEN_SECTIONS = /summon|spawn|drop|loot|tip|strateg|craft|recipe|obtain|how to get/i
// Seção curta o bastante para ficar aberta mesmo sem estar na lista
const SHORT_SECTION = 450

/**
 * "Modo limpo" para páginas sem resumo manual: tira áudio, IDs internos, notas de rodapé e as seções de histórico,
 * galeria, conquistas e curiosidades; as seções longas que sobram ficam recolhidas (`<details>`), menos a introdução,
 * as 2 primeiras e as de invocação, drops, dicas/estratégia e crafting. Recebe o HTML já passado por `cleanArticle`.
 */
export function tidyArticle(cleanHtml: string): string {
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html')
  const root = doc.body

  root
    .querySelectorAll(
      [
        'audio, .sound, .mw-tmh-player',
        '.infobox .section.sounds, .section.ids, .section.projectile',
        'sup.reference, .reflist, .mw-references-wrap, ol.references',
      ].join(','),
    )
    .forEach((el) => el.remove())
  // Blocos da ficha cujo título é "Sounds"; linhas "Internal ... ID" soltas
  root.querySelectorAll('.infobox .section').forEach((s) => {
    if (s.querySelector(':scope > .title')?.textContent?.trim().toLowerCase() === 'sounds') s.remove()
  })
  root.querySelectorAll('li').forEach((li) => {
    if (/^Internal\b.*\bID\b/i.test((li.textContent ?? '').trim().slice(0, 60))) li.remove()
  })
  // Listas e linhas que ficaram vazias
  root.querySelectorAll('ul, tr').forEach((el) => {
    if (!el.closest('.infobox') && !(el.textContent ?? '').trim() && !el.querySelector('img')) el.remove()
  })

  const container = root.querySelector('.mw-parser-output') ?? root
  const sections: { heading: Element; level: number; nodes: Element[] }[] = []
  for (const child of Array.from(container.children)) {
    if (headingLevel(child) === 2) {
      sections.push({ heading: child, level: 2, nodes: [] })
    } else if (sections.length) {
      sections[sections.length - 1].nodes.push(child)
    }
  }

  let kept = 0
  for (const sec of sections) {
    const title = (sec.heading.querySelector('.mw-headline') ?? sec.heading).textContent?.trim() ?? ''
    if (DROP_SECTIONS.test(title) || el_isToc(sec.heading)) {
      sec.heading.remove()
      sec.nodes.forEach((n) => n.remove())
      continue
    }
    kept++
    const text = sec.nodes.map((n) => n.textContent ?? '').join('').length
    const hasCrafting = sec.nodes.some((n) => n.matches('[data-crafting-slot]') || n.querySelector('[data-crafting-slot]'))
    if (kept <= 2 || OPEN_SECTIONS.test(title) || hasCrafting || text <= SHORT_SECTION) continue

    const details = doc.createElement('details')
    details.className = 'wiki-sec'
    const summary = doc.createElement('summary')
    sec.heading.before(details)
    summary.appendChild(sec.heading)
    details.appendChild(summary)
    const body = doc.createElement('div')
    body.className = 'wiki-sec-body'
    sec.nodes.forEach((n) => body.appendChild(n))
    details.appendChild(body)
  }

  return root.innerHTML
}

function el_isToc(heading: Element) {
  return heading.id === 'mw-toc-heading'
}

/** Nível de um título (h2 → 2), ou 0 se não é título. Entende o formato novo do MediaWiki (div.mw-heading). */
function headingLevel(el: Element) {
  const h = el.matches('h1, h2, h3, h4, h5, h6') ? el : el.classList.contains('mw-heading') ? el.querySelector('h1, h2, h3, h4, h5, h6') : null
  return h ? Number(h.tagName[1]) : 0
}

/**
 * Seção "Crafting" da wiki: o conteúdo dela vai para dentro de
 * `<div data-crafting-slot><div data-crafting-original>…</div></div>`.
 * O app desenha as receitas dele no slot e esconde o original (que volta se o app não tiver dados).
 */
function markCraftingSection(doc: Document) {
  const anchor = doc.getElementById('Crafting')
  const heading = anchor?.closest('.mw-heading') ?? anchor?.closest('h2, h3')
  if (!heading) return
  const level = headingLevel(heading)
  const original = doc.createElement('div')
  original.setAttribute('data-crafting-original', '')
  let next = heading.nextElementSibling
  while (next) {
    const level2 = headingLevel(next)
    if (level2 && level2 <= level) break
    const current = next
    next = next.nextElementSibling
    original.appendChild(current)
  }
  const slot = doc.createElement('div')
  slot.setAttribute('data-crafting-slot', '')
  slot.appendChild(original)
  heading.after(slot)
}

/** Primeira imagem da ficha (infobox) de um artigo já limpo: normalmente o sprite do item/NPC. */
export function infoboxImage(cleanHtml: string): string | undefined {
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html')
  return doc.querySelector('.infobox img')?.getAttribute('src') ?? undefined
}
