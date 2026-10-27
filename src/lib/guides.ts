// Páginas reorganizadas (src/data/guides/*.json): resumos em português, num formato fixo por tipo.
// Escritas à mão (com IA, sem API paga) a partir dos artigos da wiki. Veja "Páginas reorganizadas" no CLAUDE.md.
// `node scripts/build-guides.mjs` confere o formato e gera src/data/guide-index.json (etiquetas da busca).

import { matchToken, normalize, STOPWORDS } from './ptSearch'

/**
 * Texto com marcações simples:
 * - `[[Iron Bar]]` → item clicável (nome PT + EN, sprite)
 * - `[[Iron Bar|barras]]` → link com outro texto
 * - `**negrito**`
 */
export type Text = string

/** Item de uma lista: só o nome em inglês, ou com quantidade/observação. */
export type ItemRef = string | { name: string; qty?: string; note?: Text }

export interface ItemGroup {
  label?: Text
  items: ItemRef[]
}

/** Uma seção: parágrafos/tópicos, listas de itens e receitas (da Fase 4) de alguns itens. */
export interface Section {
  text?: Text[]
  groups?: ItemGroup[]
  /** Mostra as receitas desses itens (ex.: o item que invoca o chefe) */
  recipesOf?: string[]
}

export interface Fact {
  label: string
  value: Text
  /** Valores por modo [Clássico, Expert, Mestre] (molde novo): o do mundo ativo fica destacado */
  modes?: [string, string, string]
}

interface GuideBase {
  /** Título do artigo na wiki em inglês */
  page: string
  /** Palavras que alguém usaria pra descrever a coisa sem saber o nome */
  tags: string[]
  summary: Text
  facts?: Fact[]
  tips?: Text[]
  /** Revisão do artigo da wiki usada para escrever o resumo */
  source: { revid: number; date: string }
}

export interface EventGuide extends GuideBase {
  type: 'evento'
  natural: Section
  summon: Section
  effects: Section
  enemies: Section
  drops: Section
}

export interface BossGuide extends GuideBase {
  type: 'chefe'
  summon: Section
  where: Section
  prep: Section
  phases: { name: string; text: Text[] }[]
  drops: Section
}

export interface ItemGuide extends GuideBase {
  type: 'item'
  what: Section
  obtain: Section
  /** Observações extras; as receitas vêm sozinhas do recipes.json */
  crafting?: Section
  usedIn?: Section
}

/** Molde antigo (sem `format`): seções longas por tipo. */
export type GuideV1 = EventGuide | BossGuide | ItemGuide

// ---------- Molde novo (`format: 2`): curto, só o que se usa durante o jogo ----------
// Veja "Molde novo das páginas" no CLAUDE.md. Ordem: ficha → "Em 10 segundos" (`quick`) → "Para a nossa dupla" (`duo`) → seções do tipo.

/** Atalhos para ferramentas, sempre sobre a própria página: `buffs`/`arena` (chefe), `drops`, `modifier` (arma), `tree` (crafting). */
export type Shortcut = 'buffs' | 'arena' | 'drops' | 'modifier' | 'tree'

/** Bloco da caixa "Para a nossa dupla" de um chefe: o que levar a partir de uma etapa (id de STAGES). */
export interface DuoStage {
  stage: string
  take: ItemRef[]
  note?: Text
}

/** Caixa "Para a nossa dupla" de um item: serve para a classe? alternativas melhores ou mais baratas. */
export interface DuoItem {
  text: Text
  alt?: ItemRef[]
}

interface GuideBaseV2 extends GuideBase {
  format: 2
  /** "Em 10 segundos": chefe/evento = 3 linhas (invocar, fazer, cuidado); item = 2 (para que serve, quando vale a pena) */
  quick: Text[]
  shortcuts?: Shortcut[]
}

/** Chefe ou evento. `phases` e `dropsMore` (o que não importa para progressão) ficam recolhidos. */
export interface BossGuideV2 extends GuideBaseV2 {
  type: 'chefe' | 'evento'
  duo: { summoner: DuoStage[]; mage: DuoStage[] }
  summon: Section
  arena: Section
  phases: { name: string; text: Text[] }[]
  drops: Section
  dropsMore?: Section
}

export interface ItemGuideV2 extends GuideBaseV2 {
  type: 'item'
  duo: { summoner: DuoItem; mage: DuoItem }
  /** As receitas vêm sozinhas do recipes.json; aqui entram drop, vendedor e observações */
  obtain: Section
  modifier?: Section
  usedIn?: Section
}

/** Estação de crafting (só o molde está definido; ainda sem páginas). */
export interface CraftingGuideV2 extends GuideBaseV2 {
  type: 'crafting'
  what: Section
  build: Section
  /** O que ela produz de importante, por etapa (um grupo por etapa, com a etapa no título) */
  produces: Section
  /** Substitutos (ex.: Mithril ou Orichalcum) */
  substitutes: Section
}

export type GuideV2 = BossGuideV2 | ItemGuideV2 | CraftingGuideV2
export type Guide = GuideV1 | GuideV2
export const isV2 = (g: Guide): g is GuideV2 => (g as { format?: number }).format === 2

// Só os nomes dos arquivos entram no app; o conteúdo de cada página é baixado quando ela abre.
const loaders = import.meta.glob<Guide>('../data/guides/*.json', { import: 'default' })

/** "Eye of Cthulhu" ↔ "Eye_of_Cthulhu.json" (caracteres proibidos em nome de arquivo viram %XX) */
export function guideFileName(page: string) {
  return page.replace(/ /g, '_').replace(/[\\/:*?"<>|%]/g, (c) => encodeURIComponent(c)) + '.json'
}

const byPage = new Map(
  Object.entries(loaders).map(([path, load]) => {
    const file = path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
    return [decodeURIComponent(file).replace(/_/g, ' ').toLowerCase(), load]
  }),
)

/** A página tem resumo organizado? (sem baixar nada) */
export function hasGuide(page: string) {
  return byPage.has(page.replace(/_/g, ' ').toLowerCase())
}

export function loadGuide(page: string): Promise<Guide> | null {
  return byPage.get(page.replace(/_/g, ' ').toLowerCase())?.() ?? null
}

// ---------- Busca por etiquetas ----------

export interface GuideMatch {
  page: string
  pt?: string
  type: string
  /** Etiquetas que bateram com o que foi digitado */
  matched: string[]
  /** Todas as palavras digitadas bateram */
  complete: boolean
  score: number
}

interface IndexEntry {
  page: string
  pt?: string
  type: string
  tags: { text: string; norm: string; tokens: string[] }[]
}

let index: Promise<IndexEntry[]> | null = null

// Palavras comuns numa descrição que não dizem nada sozinhas ("máquina **que** transforma")
const FILLER = new Set(['que', 'com', 'sem', 'pra', 'para', 'por', 'uma', 'uns', 'umas', 'num', 'numa', 'nos', 'nas', 'como', 'onde', 'qual', 'mais', 'muito', 'muita'])

function loadIndex() {
  index ??= import('../data/guide-index.json').then(({ default: json }) =>
    // Formato gerado por scripts/build-guides.mjs: [página, tipo, nome PT ou "", etiquetas]
    (json as unknown as [string, string, string, string[]][]).map(([page, type, pt, tags]) => ({
      page,
      type,
      pt: pt || undefined,
      tags: tags.map((text) => {
        const norm = normalize(text)
        return { text, norm, tokens: norm.split(' ') }
      }),
    })),
  )
  return index
}

/**
 * Acha páginas pela descrição ("peneira de limo" → Extractinator).
 * Cada palavra digitada que bate com alguma etiqueta soma pontos; etiqueta inteira igual vale mais.
 */
export async function searchGuides(query: string, limit = 3): Promise<GuideMatch[]> {
  const q = normalize(query)
  // Palavras muito curtas batem com quase tudo: ficam de fora
  const words = q.split(' ').filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !FILLER.has(w))
  if (!words.length) return []
  const entries = await loadIndex()

  const results: GuideMatch[] = []
  for (const entry of entries) {
    let score = 0
    let hits = 0
    const matched = new Set<string>()
    const near = new Set<string>() // bateu com erro de digitação: aparece depois das exatas
    words.forEach((word, i) => {
      let best = -1
      for (const tag of entry.tags) {
        const dist = matchToken(word, tag.tokens, i === words.length - 1)
        if (dist === -1) continue
        if (best === -1 || dist < best) best = dist
        ;(dist === 0 ? matched : near).add(tag.text)
      }
      if (best === -1) return
      hits++
      score += best === 0 ? 1 : 0.6
    })
    if (score === 0) continue
    // Etiqueta de várias palavras escrita inteira ("lua vermelha") vale um ponto a mais
    for (const tag of entry.tags) {
      if (tag.tokens.length > 1 && ` ${q} `.includes(` ${tag.norm} `)) {
        score += 1
        matched.add(tag.text)
      }
    }
    results.push({ page: entry.page, pt: entry.pt, type: entry.type, matched: [...new Set([...matched, ...near])], complete: hits === words.length, score })
  }
  // Resultados bem mais fracos que o melhor (ex.: só um erro de digitação) atrapalham: ficam de fora
  const top = Math.max(0, ...results.map((r) => r.score))
  return results
    .filter((r) => r.score >= top / 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
