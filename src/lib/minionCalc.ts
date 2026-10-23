// Calculadora de lacaios e sentinelas (/ferramentas/lacaios).
//
// As vagas de cada peça e acessório vêm da tabela Equipinfo da wiki (maxMinions / maxTurrets) e o total de
// cada conjunto (já com o bônus de conjunto) das páginas "Minion-summoning weapons" e "Sentry-summoning
// weapons" — tudo em tools-data.json. Aqui ficam só as poções/mesas e QUANDO cada coisa pode ser conseguida,
// que a wiki não guarda em tabela: etapa mínima e, se precisar, o chefe/evento (key de MILESTONES).

import { STAGES, stageAtLeast, type StageId } from './progression'
import type { ToolsData } from './toolsData'

export interface Availability {
  stage: StageId
  /** Chefe ou evento que precisa ter sido derrotado (key de MILESTONES) */
  needs?: string
}

// Conjuntos (página da wiki) e itens avulsos
export const GEAR_AVAILABILITY: Record<string, Availability> = {
  'Flinx Fur Coat': { stage: 'start' },
  'Obsidian armor': { stage: 'post-evil' }, // Escama Sombria / Amostra de Tecido
  'Bee armor': { stage: 'start', needs: 'Queen Bee' },
  'Spider armor': { stage: 'hardmode' },
  'Forbidden armor': { stage: 'hardmode' },
  'Hallowed armor': { stage: 'post-mech' },
  'Chlorophyte armor': { stage: 'post-all-mechs' },
  'Tiki armor': { stage: 'post-plantera' }, // Médico Bruxo vende depois da Plantera
  'Spooky armor': { stage: 'post-plantera', needs: 'Pumpkin Moon' },
  'Stardust armor': { stage: 'post-moon-lord' }, // Barras de Luminita
  'Squire armor': { stage: 'post-mech', needs: "Old One's Army" },
  'Monk armor': { stage: 'post-mech', needs: "Old One's Army" },
  'Apprentice armor': { stage: 'post-mech', needs: "Old One's Army" },
  'Huntress armor': { stage: 'post-mech', needs: "Old One's Army" },
  'Valhalla Knight armor': { stage: 'post-golem', needs: "Old One's Army" },
  'Shinobi Infiltrator armor': { stage: 'post-golem', needs: "Old One's Army" },
  'Dark Artist armor': { stage: 'post-golem', needs: "Old One's Army" },
  'Red Riding armor': { stage: 'post-golem', needs: "Old One's Army" },

  'Pygmy Necklace': { stage: 'start', needs: 'Queen Bee' }, // Médico Bruxo chega depois da Abelha Rainha
  'Necromantic Scroll': { stage: 'post-plantera', needs: 'Pumpkin Moon' },
  'Papyrus Scarab': { stage: 'post-plantera', needs: 'Pumpkin Moon' },
  "Apprentice's Scarf": { stage: 'post-evil', needs: "Old One's Army" },
  "Squire's Shield": { stage: 'post-evil', needs: "Old One's Army" },
  "Huntress's Buckler": { stage: 'post-evil', needs: "Old One's Army" },
  "Monk's Belt": { stage: 'post-evil', needs: "Old One's Army" },

  'Summoning Potion': { stage: 'start' },
  'Bewitching Table': { stage: 'post-skeletron' }, // Masmorra
  'War Table': { stage: 'post-evil', needs: "Old One's Army" },
}

/** Poções e mesas: o buff que dão e quantas vagas somam. */
export const BUFF_SOURCES = [
  { item: 'Summoning Potion', buff: 'Summoning', minions: 1, sentries: 0 },
  { item: 'Bewitching Table', buff: 'Bewitched', minions: 1, sentries: 0 },
  { item: 'War Table', buff: 'Strategist', minions: 0, sentries: 1 },
] as const

export type Slot = 'head' | 'body' | 'legs'
export const SLOTS: Slot[] = ['head', 'body', 'legs']
export const SLOT_LABELS: Record<Slot, string> = { head: 'Cabeça', body: 'Corpo', legs: 'Pernas' }

export interface Loadout {
  head: string | null
  body: string | null
  legs: string | null
  accessories: string[]
  buffs: string[]
}

export const EMPTY_LOADOUT: Loadout = { head: null, body: null, legs: null, accessories: [], buffs: [] }

/** Peças de armadura que dão vagas, por parte do corpo (com o conjunto de cada uma). */
export function armorOptions(d: ToolsData) {
  const bySlot: Record<Slot, { name: string; set: string }[]> = { head: [], body: [], legs: [] }
  for (const [set, info] of Object.entries(d.sets)) {
    for (const piece of info.pieces) {
      const slot = d.items.get(piece)?.slot
      if (slot && !bySlot[slot].some((p) => p.name === piece)) bySlot[slot].push({ name: piece, set })
    }
  }
  return bySlot
}

/** Acessórios que dão vagas: os de lacaio somam; os do Exército do Ancião (+1 sentinela) não somam entre si. */
export function accessoryOptions(d: ToolsData) {
  const list: { name: string; minions: number; sentries: number; ooa: boolean }[] = []
  for (const [name, e] of Object.entries(d.equip)) {
    if (d.items.get(name)?.kind !== 'accessory') continue
    const minions = Number(e.maxMinions ?? 0)
    const ooa = e.dd2Accessory === true
    if (minions || ooa) list.push({ name, minions, sentries: ooa ? 1 : Number(e.maxTurrets ?? 0), ooa })
  }
  return list.sort((a, b) => Number(a.ooa) - Number(b.ooa))
}

export interface Line {
  label: string
  item?: string
  minions: number
  sentries: number
  note?: string
}

/** Soma as vagas. Começa com 1 lacaio e 1 sentinela (o que todo jogador tem). */
export function compute(d: ToolsData, l: Loadout) {
  const lines: Line[] = [{ label: 'Todo jogador', minions: 1, sentries: 1 }]
  for (const slot of SLOTS) {
    const piece = l[slot]
    if (!piece) continue
    const e = d.equip[piece] ?? {}
    lines.push({ label: SLOT_LABELS[slot], item: piece, minions: Number(e.maxMinions ?? 0), sentries: Number(e.maxTurrets ?? 0) })
  }
  // Bônus de conjunto: total do conjunto menos o que as peças já dão
  const set = completeSet(d, l)
  if (set) {
    const info = d.sets[set]
    const pieces = info.pieces.map((p) => d.equip[p] ?? {})
    const minions = info.minions - pieces.reduce((s, e) => s + Number(e.maxMinions ?? 0), 0)
    const sentries = info.sentries - pieces.reduce((s, e) => s + Number(e.maxTurrets ?? 0), 0)
    if (minions || sentries) lines.push({ label: 'Bônus de conjunto', item: set, minions, sentries })
  }
  let ooaCounted = false
  for (const name of l.accessories) {
    const e = d.equip[name] ?? {}
    if (e.dd2Accessory) {
      lines.push({ label: 'Acessório', item: name, minions: 0, sentries: ooaCounted ? 0 : 1, note: ooaCounted ? 'não soma com outro do Exército do Ancião' : undefined })
      ooaCounted = true
    } else lines.push({ label: 'Acessório', item: name, minions: Number(e.maxMinions ?? 0), sentries: Number(e.maxTurrets ?? 0) })
  }
  for (const b of BUFF_SOURCES) if (l.buffs.includes(b.item)) lines.push({ label: 'Buff', item: b.item, minions: b.minions, sentries: b.sentries })
  return {
    lines,
    set,
    minions: lines.reduce((s, x) => s + x.minions, 0),
    sentries: lines.reduce((s, x) => s + x.sentries, 0),
  }
}

/** Conjunto completo vestido (as 3 peças de um mesmo conjunto; Flinx Fur Coat é peça única). */
export function completeSet(d: ToolsData, l: Loadout) {
  for (const [set, info] of Object.entries(d.sets)) {
    if (info.pieces.length < 3) continue
    if (info.pieces.every((p) => p === l.head || p === l.body || p === l.legs)) return set
  }
  return null
}

/** O item já pode ser conseguido? Sem mundo (`defeated` null) não confere chefes opcionais. */
export function isAvailable(name: string, stage: StageId, defeated: Set<string> | null) {
  const a = GEAR_AVAILABILITY[name]
  if (!a) return false
  if (!stageAtLeast(stage, a.stage)) return false
  return !a.needs || !defeated || defeated.has(a.needs)
}

/**
 * Melhor combinação na etapa: o conjunto com mais vagas (de lacaio ou de sentinela, conforme `focus`),
 * todos os acessórios de vaga disponíveis e as poções/mesas.
 */
export function suggest(d: ToolsData, stage: StageId, defeated: Set<string> | null, focus: 'minions' | 'sentries'): Loadout {
  // Empate: o conjunto que chega mais tarde no jogo e depois o de mais dano de lacaio nas peças
  const order = (set: string) => STAGES.findIndex((s) => s.id === GEAR_AVAILABILITY[set]?.stage)
  const damage = (set: string) => d.sets[set].pieces.reduce((s, p) => s + Number(d.equip[p]?.minionDamage ?? 0), 0)
  const sets = Object.entries(d.sets)
    .filter(([set]) => isAvailable(set, stage, defeated))
    .sort(
      ([sa, a], [sb, b]) =>
        b[focus] - a[focus] || b.minions + b.sentries - (a.minions + a.sentries) || order(sb) - order(sa) || damage(sb) - damage(sa),
    )
  const loadout: Loadout = { ...EMPTY_LOADOUT, accessories: [], buffs: [] }
  const best = sets[0]
  if (best && best[1][focus] > 0) {
    for (const piece of best[1].pieces) {
      const slot = d.items.get(piece)?.slot
      if (slot) loadout[slot] = piece
    }
  }
  const accessories = accessoryOptions(d).filter((a) => isAvailable(a.name, stage, defeated))
  loadout.accessories = accessories.filter((a) => !a.ooa).map((a) => a.name)
  // Um do Exército do Ancião (+1 sentinela) só quando o foco é sentinela
  const ooa = accessories.find((a) => a.ooa)
  if (focus === 'sentries' && ooa) loadout.accessories.push(ooa.name)
  loadout.buffs = BUFF_SOURCES.filter((b) => (focus === 'minions' ? b.minions : b.sentries) && isAvailable(b.item, stage, defeated)).map((b) => b.item)
  return loadout
}
