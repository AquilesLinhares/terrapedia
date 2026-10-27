// Coloca um artigo da wiki (já limpo pelo cleanArticle) em português:
//
// 1. Rótulos fixos (fichas, tabelas, títulos) vêm de WIKI_LABELS — funcionam sempre.
// 2. Nomes do jogo (links, itens das tabelas, título da ficha) viram o nome oficial PT do dicionário.
//    O nome em inglês aparece pequeno ao lado (tabelas e ficha) ou ao passar o mouse (no texto).
// 3. Células curtas de tabela com só um nome ou rótulo também são trocadas por busca direta.
//    O texto corrido fica em inglês: varrer parágrafos atrás de nomes era pesado e foi removido.

import { loadDictionary, normalize } from './ptSearch'
import { WIKI_LABELS } from './wikiLabels'
import manualNames from '../../scripts/manual-names.json'

export interface GameNames {
  /** Nome EN exato ("Iron Bar") → nome PT.  */
  exact: Map<string, string>
  /** Nome EN em minúsculas → nome PT. Usado no texto dos links. */
  lower: Map<string, string>
}

// Quando o mesmo nome EN tem vários nomes PT, vale o do tipo mais "oficial".
// Buffs ficam por último: muitos têm o mesmo nome de outra coisa ("Fishing").
const TYPE_PRIORITY = ['item', 'npc', 'chefe', 'evento', 'bioma', 'guia', 'página', 'buff']

// Nome EN → nome PT a usar no lugar do dicionário (null = manter em inglês, como no resto do app)
const NAME_OVERRIDES: Record<string, string | null> = {
  Shimmer: null, // a wiki PT chama de "Brilhante"; o app usa "Shimmer" (ver recipes.ts)
}

let names: Promise<GameNames> | null = null

/** Nomes do jogo EN → PT, montados uma vez a partir do dicionário. */
export function loadGameNames(): Promise<GameNames> {
  names ??= loadDictionary().then((entries) => {
    const best = new Map<string, { pt: string; rank: number }>()
    const consider = (en: string, pt: string, type: string) => {
      if (en.length < 3) return
      const rank = TYPE_PRIORITY.indexOf(type) === -1 ? TYPE_PRIORITY.length : TYPE_PRIORITY.indexOf(type)
      const current = best.get(en)
      if (!current || rank < current.rank) best.set(en, { pt, rank })
    }
    // Apelidos ("Bancadas", "Chefões") e o próprio nome em inglês não servem como nome principal
    for (const e of entries) if (normalize(e.pt) !== normalize(e.en)) consider(e.en, e.pt, e.type)
    // Nomes escolhidos à mão (scripts/manual-names.json) valem mais que os apelidos do dicionário
    for (const m of manualNames) best.set(m.en, { pt: m.pt, rank: -1 })
    // Exceções: o nome vindo da wiki em português não é o que se usa no jogo
    for (const [en, pt] of Object.entries(NAME_OVERRIDES)) best.set(en, { pt: pt ?? en, rank: -1 })

    const exact = new Map<string, string>()
    const lower = new Map<string, string>()
    for (const [en, { pt }] of best) {
      // Nome PT igual ao EN (ex.: "Hardmode"): não há o que trocar
      if (normalize(pt) === normalize(en)) continue
      exact.set(en, pt)
      if (!lower.has(en.toLowerCase())) lower.set(en.toLowerCase(), pt)
    }
    return { exact, lower }
  })
  return names
}


/** Coloca o artigo em português (rótulos e nomes do jogo; o texto corrido fica em inglês). Devolve o HTML. */
export function localizeArticle(cleanHtml: string, gameNames: GameNames) {
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html')
  const ctx: Context = { doc, names: gameNames, done: new WeakSet() }
  translateLabels(ctx)
  translateLinkNames(ctx)
  translateShortCells(ctx)
  return doc.body.innerHTML
}

interface Context {
  doc: Document
  names: GameNames
  /** Elementos e textos que já estão em português (não são mexidos de novo) */
  done: WeakSet<Node>
}

// ---------- 1. Rótulos ----------

const LABEL_SELECTOR = [
  'th',
  'caption',
  '.mw-headline',
  '.mw-heading h2, .mw-heading h3, .mw-heading h4',
  '.infobox .title',
  '.infobox .tag',
  '.infobox .name',
  '.knockback',
  '.usetime',
  '.small-bold',
  '.coin .t',
  '.mode-legend span',
].join(',')

// Onde um nome do jogo sozinho também conta como rótulo ("Moon Lord" como título de seção)
const NAME_LABEL_SELECTOR = '.mw-headline, .mw-heading, .infobox .title, .infobox .name, caption'

function translateLabels(ctx: Context) {
  for (const el of ctx.doc.body.querySelectorAll(LABEL_SELECTOR)) {
    const nameAllowed = !!el.closest(NAME_LABEL_SELECTOR)
    for (const node of textNodes(el)) {
      const raw = node.nodeValue ?? ''
      const text = raw.trim()
      if (!text) continue
      const pt = WIKI_LABELS[text] ?? (nameAllowed ? ctx.names.exact.get(text) : undefined)
      if (pt === undefined) continue
      node.nodeValue = raw.replace(text, pt)
      ctx.done.add(node)
      // Título da ficha ("Zenith" → "Zênite"): o nome em inglês fica pequeno ao lado
      if (pt !== text && node.parentElement?.matches('.infobox .title') && ctx.names.exact.has(text)) {
        node.after(enName(ctx.doc, text))
      }
    }
    // Rótulo inteiro resolvido: o tradutor não precisa ver
    if (textNodes(el).every((n) => !n.nodeValue?.trim() || ctx.done.has(n))) ctx.done.add(el)
  }
}

// ---------- 2. Nomes nos links ----------

function translateLinkNames(ctx: Context) {
  for (const a of ctx.doc.body.querySelectorAll('a')) {
    const nodes = textNodes(a).filter((n) => n.nodeValue?.trim())
    if (nodes.length !== 1) continue
    const node = nodes[0]
    const text = node.nodeValue!.trim()
    let pt = ctx.names.exact.get(text) ?? ctx.names.lower.get(text.toLowerCase())
    if (!pt) continue
    // "moon phase" no meio da frase continua com minúscula
    if (/^[a-z]/.test(text)) pt = pt[0].toLowerCase() + pt.slice(1)
    node.nodeValue = node.nodeValue!.replace(text, pt)
    if (!a.getAttribute('title')) a.setAttribute('title', text)
    ctx.done.add(a)
    // Itens com ícone (tabelas de receitas, drops...): nome EN pequeno ao lado
    if (a.closest('.i') && !a.querySelector('img')) a.after(enName(ctx.doc, text))
  }
}

function enName(doc: Document, en: string) {
  const small = doc.createElement('small')
  small.className = 'en-name'
  small.textContent = en
  return small
}

// ---------- 3. Células curtas de tabela ----------

// Células só com um nome ou rótulo ("Iron Anvil", "Yes"): busca direta no Map, sem varrer o texto
const SHORT_CELL = 40

function translateShortCells(ctx: Context) {
  for (const td of ctx.doc.body.querySelectorAll('td')) {
    if (td.childElementCount > 0) continue
    const nodes = textNodes(td)
    if (nodes.length !== 1 || ctx.done.has(nodes[0])) continue
    const raw = nodes[0].nodeValue ?? ''
    const text = raw.trim()
    if (!text || text.length > SHORT_CELL) continue
    const pt = WIKI_LABELS[text] ?? ctx.names.exact.get(text)
    if (pt === undefined || pt === text) continue
    nodes[0].nodeValue = raw.replace(text, pt)
    ctx.done.add(nodes[0])
  }
}

function textNodes(el: Element): Text[] {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
}
