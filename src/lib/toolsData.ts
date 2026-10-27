// Dados das Ferramentas (/ferramentas): src/data/tools-data.json, gerado por scripts/build-tools.mjs
// a partir das tabelas Cargo da wiki (Items, Equipinfo, Modifiers, Drops). Só é baixado quando uma
// ferramenta abre. Também guarda a etapa escolhida quando não há mundo ativo.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { loadExclusive } from './classGuides'
import { STAGES, type StageId } from './progression'
import { useWorld, useWorldStage, type PlayerClass } from './world'

export type ItemKind = 'weapon' | 'accessory' | 'armor' | 'tool'
export type DamageClass = 'melee' | 'ranged' | 'magic' | 'summon'

export interface ToolItem {
  name: string
  kind: ItemKind
  class: DamageClass | null
  /** Categoria da wiki (listcat): "broadswords", "whips", "guns"... */
  cat: string | null
  slot: 'head' | 'body' | 'legs' | null
  /** Página do conjunto de armadura ("Spooky armor") */
  set: string | null
  damage: number | null
  useTime: number | null
  knockback: number | null
  crit: number | null
  velocity: number | null
  mana: number | null
  rare: number | null
  defense: number | null
  autoswing: boolean
  hardmode: boolean
  buffs: string[]
  debuffs: string[]
  /** Arma que se gasta (Shuriken, granadas): não recebe modificador */
  consumable: boolean
}

/** Bônus de equipamento (tabela Equipinfo): números são frações (0.1 = +10%) ou quantidades. */
export type EquipStats = Record<string, number | boolean | string>

export interface Modifier {
  damage?: number
  speed?: number
  critical?: number
  knockback?: number
  velocity?: number
  mana?: number
  size?: number
  tag?: number
  arpen?: number
}

export interface ToolsData {
  source: { date: string; modifiersRevid: number; minionsRevid: number; sentriesRevid: number }
  items: Map<string, ToolItem>
  equip: Record<string, EquipStats>
  /** Conjuntos de invocador: vagas totais (já com o bônus de conjunto) e peças */
  sets: Record<string, { minions: number; sentries: number; pieces: string[] }>
  modifiers: Record<string, Modifier>
  modCats: Record<'universal' | 'common' | 'melee' | 'ranged' | 'magic' | 'summon', string[]> & {
    accessory: { name: string; effect: string; value: string }[]
    /** Todos os modificadores de arma, do mais valioso ao menos (ordem da wiki) */
    order: string[]
  }
  /** Nome oficial PT de cada modificador ("Legendary" → "Lendário") */
  modifierPt: Record<string, string>
  /** Item → [fonte, chance %, modo exclusivo?] */
  drops: Record<string, [string, number | null, ('expert' | 'master')?][]>
  /** Item → NPCs que vendem */
  vendors: Record<string, string[]>
  /** Itens exclusivos de Expert (raridade -12) ou Mestre (-13), de toda a tabela Items da wiki */
  exclusive: Record<string, 'expert' | 'master'>
}

let data: Promise<ToolsData> | null = null

export function loadToolsData(): Promise<ToolsData> {
  data ??= import('../data/tools-data.json').then(({ default: json }) => {
    const raw = json as unknown as Omit<ToolsData, 'items'> & { fields: string[]; items: Record<string, unknown[]> }
    const items = new Map<string, ToolItem>()
    for (const [name, row] of Object.entries(raw.items)) {
      const it: Record<string, unknown> = { name }
      raw.fields.forEach((f, i) => {
        const v = row[i] ?? 0
        if (f === 'buffs' || f === 'debuffs') it[f] = v || []
        else if (f === 'autoswing' || f === 'hardmode' || f === 'consumable') it[f] = v === 1
        else it[f] = v === 0 && !['damage', 'knockback', 'crit', 'defense', 'rare'].includes(f) ? null : v
      })
      // Zero nos números só vale quando o item tem aquele número (ex.: repulsão 0 de uma arma)
      if (it.kind !== 'weapon' && it.damage === 0) it.damage = null
      if (it.kind !== 'weapon' && it.knockback === 0) it.knockback = null
      if (it.kind !== 'weapon' && it.crit === 0) it.crit = null
      if (it.defense === 0) it.defense = null
      items.set(name, it as unknown as ToolItem)
    }
    return { ...raw, items }
  })
  return data
}

/** Selos Expert/Mestre de qualquer item: os dados das Ferramentas somados aos dos guias de classe. */
export async function loadAllExclusive() {
  const [tools, guides] = await Promise.all([loadToolsData(), loadExclusive()])
  return { ...guides, ...(tools.exclusive ?? {}) }
}

export function useToolsData() {
  const [value, setValue] = useState<ToolsData | null>(null)
  useEffect(() => {
    let alive = true
    loadToolsData().then((d) => alive && setValue(d))
    return () => {
      alive = false
    }
  }, [])
  return value
}

// Conjuntos de armadura não têm nome no jogo (o dicionário só tem as peças). Os mesmos de
// scripts/manual-names.json, que só entram no dicionário quando ele for gerado de novo.
export const SET_NAMES: Record<string, string> = {
  'Obsidian armor': 'Armadura de Obsidiana',
  'Bee armor': 'Armadura de Abelha',
  'Spider armor': 'Armadura de Aranha',
  'Forbidden armor': 'Armadura Proibida',
  'Chlorophyte armor': 'Armadura de Clorofita',
  'Hallowed armor': 'Armadura Consagrada',
  'Tiki armor': 'Armadura Tiki',
  'Spooky armor': 'Armadura Assustadora',
  'Stardust armor': 'Armadura de Pó das Estrelas',
  'Squire armor': 'Armadura do Escudeiro',
  'Monk armor': 'Armadura do Monge',
  'Apprentice armor': 'Armadura do Aprendiz',
  'Huntress armor': 'Armadura da Caçadora',
  'Valhalla Knight armor': 'Armadura do Cavaleiro de Valhalla',
  'Shinobi Infiltrator armor': 'Armadura do Shinobi Invasor',
  'Dark Artist armor': 'Armadura do Artista Sombrio',
  'Red Riding armor': 'Armadura da Chapeuzinho Vermelho',
}

// ---------- Etapa e classe usadas pelas ferramentas ----------

const STAGE_KEY = 'terrapedia:tools-stage'
const CLASS_KEY = 'terrapedia:tools-class'
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // sem localStorage: vale até fechar a página
  }
  listeners.forEach((l) => l())
}

/**
 * Etapa das ferramentas: a do mundo ativo; sem mundo, a escolhida na tela (salva no aparelho).
 * `fromWorld` diz se veio do mundo (aí não dá para trocar na ferramenta).
 */
export function useToolStage() {
  const worldStage = useWorldStage()
  const saved = useSyncExternalStore(subscribe, () => read(STAGE_KEY)) as StageId | null
  const local = STAGES.some((s) => s.id === saved) ? saved! : 'start'
  return {
    stage: worldStage?.id ?? local,
    fromWorld: worldStage !== null,
    setStage: (id: StageId) => write(STAGE_KEY, id),
  }
}

/** Classe das ferramentas: a da minha ficha no mundo ativo; sem isso, a escolhida na tela. */
export function useToolClass() {
  const state = useWorld()
  const mine = state.members.find((m) => m.userId === state.userId)?.playerClass ?? null
  const saved = useSyncExternalStore(subscribe, () => read(CLASS_KEY)) as PlayerClass | null
  return {
    playerClass: mine ?? saved,
    fromWorld: mine !== null,
    setClass: (c: PlayerClass) => write(CLASS_KEY, c),
  }
}

/** Marcos derrotados no mundo ativo (null sem mundo). */
export function useDefeated() {
  const state = useWorld()
  return state.activeId ? new Set(state.progress.map((p) => p.key)) : null
}
