// Coloca um artigo da wiki (já limpo pelo cleanArticle) em português:
//
// 1. Rótulos fixos (fichas, tabelas, títulos) vêm de WIKI_LABELS — funcionam sempre.
// 2. Nomes do jogo (links, itens das tabelas, título da ficha) viram o nome oficial PT do dicionário.
//    O nome em inglês aparece pequeno ao lado (tabelas e ficha) ou ao passar o mouse (no texto).
// 3. No texto corrido (que fica em inglês), nomes do jogo escritos sem link também viram o nome PT.
//    Cada "trecho" (um parágrafo, um item de lista, uma célula...) vira um texto em que links, imagens e
//    nomes são marcadores [0], [1]...; depois os marcadores são trocados de novo pelos elementos.

import { loadDictionary, normalize } from './ptSearch'
import { WIKI_LABELS } from './wikiLabels'
import manualNames from '../../scripts/manual-names.json'

export interface GameNames {
  /** Nome EN exato ("Iron Bar") → nome PT. Usado para achar nomes no meio do texto. */
  exact: Map<string, string>
  /** Nome EN em minúsculas → nome PT. Usado no texto dos links. */
  lower: Map<string, string>
  /** Maior número de palavras de um nome (limita a busca no texto) */
  maxWords: number
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
    let maxWords = 1
    for (const [en, { pt }] of best) {
      // Nome PT igual ao EN (ex.: "Hardmode"): não há o que trocar
      if (normalize(pt) === normalize(en)) continue
      exact.set(en, pt)
      if (!lower.has(en.toLowerCase())) lower.set(en.toLowerCase(), pt)
      maxWords = Math.max(maxWords, en.split(' ').length)
    }
    return { exact, lower, maxWords: Math.min(maxWords, 6) }
  })
  return names
}

const TOKEN = (i: number) => `[${i}]`
const TOKEN_RE = /\[\s*(\d+)\s*\]/g
const HAS_TOKEN = /\[\s*\d+\s*\]/

/** Coloca o artigo em português (rótulos e nomes do jogo; o texto corrido fica em inglês). Devolve o HTML. */
export function localizeArticle(cleanHtml: string, gameNames: GameNames) {
  const doc = new DOMParser().parseFromString(cleanHtml, 'text/html')
  const ctx: Context = { doc, names: gameNames, done: new WeakSet() }
  translateLabels(ctx)
  translateLinkNames(ctx)
  processChildren(ctx, doc.body)
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

// ---------- 3. Trechos de texto corrido ----------

const INLINE_TAGS = new Set([
  'A', 'ABBR', 'B', 'BDI', 'BR', 'CITE', 'CODE', 'EM', 'FONT', 'I', 'IMG', 'KBD', 'MARK', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR',
])
const BLOCK_INSIDE = 'div, p, ul, ol, li, table, dl, h1, h2, h3, h4, h5, h6, blockquote, pre, figure, audio'
// Nada dentro deles é traduzido
const SKIP = 'script, style, audio, pre, code, kbd, .sound, .stack, .stackdigits, .coin, .eico, .mw-cite-backlink'
// Ficam inteiros (sem tradução por dentro), viram só um marcador no texto
const ATOMIC = 'img, br, sup.reference, .i, a.image, .rarity, .en-name, .game-name'

const isInline = (el: Element) => INLINE_TAGS.has(el.tagName) && !el.querySelector(BLOCK_INSIDE)

/** Percorre um elemento: junta os pedaços em linha (texto, links, negrito...) em trechos. */
function processChildren(ctx: Context, el: Element) {
  if (ctx.done.has(el) || el.matches(SKIP)) return
  let run: Node[] = []
  for (const child of [...el.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE || (child instanceof Element && isInline(child))) {
      run.push(child)
    } else {
      if (run.length) processRun(ctx, run)
      run = []
      if (child instanceof Element) processChildren(ctx, child)
    }
  }
  if (run.length) processRun(ctx, run)
}

function processRun(ctx: Context, run: Node[]) {
  const parts: Node[] = [] // elementos/nomes que viram marcadores
  let text = ''
  for (const node of run) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (ctx.done.has(node)) {
        parts.push(node)
        text += TOKEN(parts.length - 1)
      } else {
        text += protectNames(ctx, node.nodeValue ?? '', parts)
      }
    } else {
      const el = node as Element
      // Links, negrito etc. que não são nomes: o texto de dentro é traduzido como um trecho próprio
      if (!ctx.done.has(el) && !el.matches(ATOMIC)) processChildren(ctx, el)
      parts.push(el)
      text += TOKEN(parts.length - 1)
    }
  }

  // Marcadores "de verdade" no texto original atrapalhariam: esse trecho fica como está
  const original = run.map((n) => (n.nodeType === Node.TEXT_NODE ? n.nodeValue : '')).join('')
  if (HAS_TOKEN.test(original)) return

  // Nenhum nome achado no texto: nada muda
  if (parts.every((p) => run.includes(p))) return
  const result = text.replace(/\s+/g, ' ').trim()

  // Monta o trecho de novo, com os nomes PT, mantendo os espaços das pontas
  const first = run[0]
  const last = run[run.length - 1]
  // Marca o lugar antes de mexer (os elementos do trecho vão ser movidos para dentro do fragmento)
  const parent = first.parentNode!
  const anchor = ctx.doc.createTextNode('')
  parent.insertBefore(anchor, first)
  const lead = first.nodeType === Node.TEXT_NODE && /^\s/.test(first.nodeValue ?? '') ? ' ' : ''
  const trail = last.nodeType === Node.TEXT_NODE && /\s$/.test(last.nodeValue ?? '') ? ' ' : ''
  const fragment = ctx.doc.createDocumentFragment()
  let pos = 0
  const pieces = lead + result + trail
  for (const m of pieces.matchAll(TOKEN_RE)) {
    if (m.index > pos) fragment.append(pieces.slice(pos, m.index))
    fragment.append(parts[Number(m[1])])
    pos = m.index + m[0].length
  }
  if (pos < pieces.length) fragment.append(pieces.slice(pos))

  for (const node of run) if (node.parentNode === parent) parent.removeChild(node)
  parent.replaceChild(fragment, anchor)
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu

/**
 * Acha nomes do jogo no meio de um texto ("craft a Life Crystal") e troca cada um por um marcador.
 * Só nomes que começam com maiúscula, como a wiki escreve; prefere o nome mais longo.
 */
function protectNames(ctx: Context, text: string, parts: Node[]) {
  const words = [...text.matchAll(WORD_RE)]
  let out = ''
  let pos = 0
  for (let i = 0; i < words.length; i++) {
    const start = words[i]
    if (!/^\p{Lu}/u.test(start[0])) continue
    let found: { end: number; en: string; pt: string } | null = null
    for (let j = Math.min(words.length - 1, i + ctx.names.maxWords - 1); j >= i; j--) {
      const end = words[j].index + words[j][0].length
      const candidate = text.slice(start.index, end)
      if (j > i && /[^\p{L}\p{N}'’ -]|\s{2}/u.test(candidate)) continue
      if (j === i && candidate.length < 4) continue
      const pt = ctx.names.exact.get(candidate)
      if (pt) {
        found = { end, en: candidate, pt }
        i = j
        break
      }
    }
    if (!found) continue
    const span = ctx.doc.createElement('span')
    span.className = 'game-name'
    span.title = found.en
    span.textContent = found.pt
    parts.push(span)
    out += text.slice(pos, start.index) + TOKEN(parts.length - 1)
    pos = found.end
  }
  return out + text.slice(pos)
}

function textNodes(el: Element): Text[] {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
}
