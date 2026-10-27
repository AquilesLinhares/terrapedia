// Modo construtor: catálogo de blocos/paredes e a lista do que quero construir.
//
// O catálogo sai das receitas (nenhum dado novo): blocos, tijolos, paredes e plataformas pelo sufixo do
// nome EN, mais alguns materiais de construção que existam nas receitas (`EXTRA_MATERIALS`).
// A lista (item → quantidade) fica no aparelho; o "já tenho" usa o checklist do mundo ativo.

import { useSyncExternalStore } from 'react'
import { createWorldChecklist } from './worldChecklist'
import { isGroup, type RecipeBook } from './recipes'
import type { StageId } from './progression'

export type BuildKind = 'block' | 'wall' | 'platform' | 'material'

export const KIND_LABELS: Record<BuildKind, string> = {
  block: 'Blocos',
  wall: 'Paredes',
  platform: 'Plataformas',
  material: 'Materiais',
}

// Materiais de construção que não terminam em Block/Brick/Wall/Platform. Só entram se existirem nas receitas.
export const EXTRA_MATERIALS = [
  'Wood',
  'Ebonwood',
  'Shadewood',
  'Rich Mahogany',
  'Pearlwood',
  'Boreal Wood',
  'Palm Wood',
  'Dynasty Wood',
  'Spooky Wood',
  'Glass',
  'Torch',
]

export interface CatalogItem {
  name: string
  kind: BuildKind
}

const SUFFIX = /^(.+) (Block|Brick|Wall|Platform)$/

/** Blocos, paredes, plataformas e materiais de construção que existem nos dados de receitas. */
export function buildCatalog(book: RecipeBook): CatalogItem[] {
  const all = new Set<string>([...book.byResult.keys(), ...book.byIngredient.keys()])
  const out: CatalogItem[] = []
  for (const name of all) {
    if (isGroup(name) || name.startsWith('Legacy:')) continue
    const m = SUFFIX.exec(name)
    if (m) out.push({ name, kind: m[2] === 'Wall' ? 'wall' : m[2] === 'Platform' ? 'platform' : 'block' })
  }
  for (const name of EXTRA_MATERIALS) if (all.has(name) && !out.some((i) => i.name === name)) out.push({ name, kind: 'material' })
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// Bancadas que só existem a partir de uma etapa (só as que não têm dúvida)
export const STATION_MIN_STAGE: Record<string, StageId> = {
  'Mythril Anvil': 'hardmode',
  'Orichalcum Anvil': 'hardmode',
  'Adamantite Forge': 'hardmode',
  'Titanium Forge': 'hardmode',
  'Lihzahrd Furnace': 'post-plantera',
  'Ancient Manipulator': 'post-cultist',
}

/** Etapa mínima de uma receita pela bancada ("Mythril Anvil and Ecto Mist" → hardmode), se conhecida. */
export function stationMinStage(station: string): StageId | undefined {
  for (const part of station.split(' and ')) if (STATION_MIN_STAGE[part]) return STATION_MIN_STAGE[part]
  return undefined
}

// ---------- Lista do que vou construir ----------

const PLAN_KEY = 'terrapedia:builder-plan'
export type Plan = Record<string, number>

let plan: Plan = {}
try {
  plan = JSON.parse(localStorage.getItem(PLAN_KEY) ?? '{}')
} catch {
  // sem localStorage ou dado corrompido: começa do zero
}
const listeners = new Set<() => void>()

function save(next: Plan) {
  plan = next
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(next))
  } catch {
    // sem espaço ou bloqueado: vale até fechar a página
  }
  listeners.forEach((l) => l())
}

export function useBuilderPlan() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => plan,
  )
}

export const builderPlan = {
  /** Soma `qty` ao item (cria se não existir) */
  add(name: string, qty = 100) {
    save({ ...plan, [name]: (plan[name] ?? 0) + qty })
  },
  addMany(items: Record<string, number>) {
    const next = { ...plan }
    for (const [name, qty] of Object.entries(items)) next[name] = (next[name] ?? 0) + qty
    save(next)
  },
  set(name: string, qty: number) {
    save({ ...plan, [name]: Math.max(1, Math.min(99999, Math.round(qty) || 1)) })
  },
  remove(name: string) {
    const next = { ...plan }
    delete next[name]
    save(next)
  },
  clear() {
    save({})
  },
}

/** Materiais que já tenho na lista do construtor (mundo ativo ou aparelho). Mesma tabela da árvore de crafting. */
export const BUILDER_CHECK_LIST = '@construtor'
export const useBuilderChecks = createWorldChecklist({
  table: 'world_craft_checks',
  listColumn: 'item',
  valueColumn: 'material',
  localKey: 'terrapedia:builder-checks',
})
