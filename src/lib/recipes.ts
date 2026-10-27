// Receitas de crafting (src/data/recipes.json, gerado por scripts/build-recipes.mjs).
// Funciona sem internet: o arquivo vem junto com o app e só é baixado quando precisa.

import { useEffect, useState } from 'react'
import { WIKI_BASE } from './wikiApi'
import { loadDictionary, normalize } from './ptSearch'
import { SET_NAMES } from './setNames'

export interface Ingredient {
  name: string
  amount: number
}

export interface Recipe {
  /** Posição no arquivo (serve de id para lembrar a receita escolhida) */
  id: number
  result: string
  amount: number
  /** Ex.: "Iron Anvil", "By Hand", "Work Bench and Ecto Mist" */
  station: string
  ingredients: Ingredient[]
}

export interface RecipeBook {
  recipes: Recipe[]
  /** Receitas que fazem cada item */
  byResult: Map<string, Recipe[]>
  /** Receitas que usam cada ingrediente (pelo nome exato, inclusive "Any Iron Bar") */
  byIngredient: Map<string, Recipe[]>
  /** "Any Iron Bar" → ["Iron Bar", "Lead Bar"] */
  groups: Map<string, string[]>
  /** "Iron Bar" → ["Any Iron Bar"] */
  groupsOf: Map<string, string[]>
  /** Nome em inglês → nome em português (do dicionário) */
  pt: Map<string, string>
  /** Página da wiki → itens que redirecionam para ela ("Copper armor" → Copper Helmet, ...) */
  pageItems: Map<string, string[]>
  sprites: Map<string, string | null>
}

let book: Promise<RecipeBook> | null = null

/** Carrega as receitas e os nomes PT uma vez só. */
export function loadRecipeBook(): Promise<RecipeBook> {
  book ??= Promise.all([import('../data/recipes.json'), loadDictionary()]).then(([{ default: json }, dict]) => {
    // Formato compacto: veja scripts/build-recipes.mjs
    const data = json as unknown as {
      names: string[]
      sprites: (string | 0 | null)[]
      stations: string[]
      groups: [number, number[]][]
      recipes: number[][]
    }
    const n = data.names
    const recipes: Recipe[] = data.recipes.map(([result, amount, station, ...rest], id) => {
      const ingredients: Ingredient[] = []
      for (let i = 0; i < rest.length; i += 2) ingredients.push({ name: n[rest[i]], amount: rest[i + 1] })
      return { id, result: n[result], amount, station: data.stations[station], ingredients }
    })

    const byResult = new Map<string, Recipe[]>()
    const byIngredient = new Map<string, Recipe[]>()
    const push = (map: Map<string, Recipe[]>, key: string, r: Recipe) => {
      const list = map.get(key)
      if (!list) map.set(key, [r])
      else if (list[list.length - 1] !== r) list.push(r)
    }
    for (const r of recipes) {
      push(byResult, r.result, r)
      for (const ing of r.ingredients) push(byIngredient, ing.name, r)
    }

    const groups = new Map(data.groups.map(([g, members]) => [n[g], members.map((m) => n[m])]))
    const groupsOf = new Map<string, string[]>()
    for (const [g, members] of groups) for (const m of members) groupsOf.set(m, [...(groupsOf.get(m) ?? []), g])

    const sprites = new Map(n.map((name, i) => [name, spriteFile(name, data.sprites[i])]))

    // Nome PT por nome EN. Prefere o nome oficial do item (tipo "item") a apelidos/páginas.
    const pt = new Map<string, string>()
    for (const e of dict) {
      if (normalize(e.pt) === normalize(e.en)) continue
      const key = e.en.toLowerCase()
      if (!pt.has(key) || e.type === 'item') pt.set(key, e.pt)
    }

    const pageItems = new Map<string, string[]>()
    for (const e of dict) {
      if (e.type !== 'item' || e.page.includes('#') || e.page === e.en) continue
      if (!byResult.has(e.en) && !byIngredient.has(e.en)) continue
      const key = e.page.toLowerCase()
      const list = pageItems.get(key) ?? []
      if (!list.includes(e.en)) pageItems.set(key, [...list, e.en])
    }

    return { recipes, byResult, byIngredient, groups, groupsOf, pt, pageItems, sprites }
  })
  return book
}

function spriteFile(name: string, raw: string | 0 | null) {
  if (raw === null) return null
  return raw === 0 ? `${name}.png` : raw
}

/** Hook: devolve as receitas (ou null enquanto carregam). */
export function useRecipeBook() {
  const [value, setValue] = useState<RecipeBook | null>(null)
  useEffect(() => {
    let alive = true
    loadRecipeBook().then((b) => alive && setValue(b))
    return () => {
      alive = false
    }
  }, [])
  return value
}

// ---------- Nomes, sprites e bancadas ----------

export const isGroup = (name: string) => name.startsWith('Any ')

// Termos de bancada que não são itens (ou não têm nome PT no dicionário)
const EXTRA_PT: Record<string, string> = {
  'By Hand': 'À mão',
  'Placed Bottle': 'Garrafa colocada',
  'Placed Bottle only': 'Só garrafa colocada',
  'Snow Biome': 'Bioma de Neve',
  'Ecto Mist': 'Névoa Ecto',
  Water: 'Água',
  Honey: 'Mel',
  Lava: 'Lava',
  Shimmer: 'Shimmer',
  'Pressure Plate': 'Placa de Pressão',
  Fruit: 'Fruta',
}

/** Nome em português ("Iron Bar" → "Barra de Ferro"; "Any Wood" → "Qualquer Madeira"). */
export function ptName(b: RecipeBook, en: string): string {
  if (isGroup(en)) {
    const base = en.slice(4)
    return `Qualquer ${base.split(' or ').map((part) => ptName(b, part)).join(' ou ')}`
  }
  return SET_NAMES[en] ?? b.pt.get(en.toLowerCase()) ?? EXTRA_PT[en] ?? en
}

/** Endereço do sprite. Grupos usam o sprite do primeiro item. */
export function spriteUrl(b: RecipeBook, name: string): string | undefined {
  const file = isGroup(name) ? b.sprites.get(b.groups.get(name)?.[0] ?? '') : b.sprites.get(name) ?? `${name}.png`
  return file ? `${WIKI_BASE}/images/${encodeURIComponent(file.replace(/ /g, '_'))}` : undefined
}

/** Página da wiki de um nome (grupos vão para a lista de ingredientes alternativos). */
export function pageFor(name: string) {
  return isGroup(name) ? `Alternative crafting ingredients#${name.replace(/ /g, '_')}` : name
}

// Bancadas que têm uma "irmã" equivalente (a wiki mostra "X ou Y")
const STATION_ALTERNATIVES: Record<string, string> = {
  'Iron Anvil': 'Lead Anvil',
  'Mythril Anvil': 'Orichalcum Anvil',
  'Adamantite Forge': 'Titanium Forge',
  'Demon Altar': 'Crimson Altar',
}

/**
 * Partes de uma bancada: "Iron Anvil and Ecto Mist" → [["Iron Anvil", "Lead Anvil"], ["Ecto Mist"]].
 * Cada parte é obrigatória; dentro de uma parte, qualquer opção serve.
 */
export function stationParts(station: string): string[][] {
  if (station === 'Placed Bottle only') return [[station]]
  return station.split(' and ').map((part) => {
    const alt = STATION_ALTERNATIVES[part]
    return alt ? [part, alt] : [part]
  })
}

/**
 * Itens de crafting de um artigo: o próprio título, ou os itens que redirecionam para ele
 * (o artigo "Copper armor" mostra o capacete, a cota e as grevas).
 */
export function itemsForPage(b: RecipeBook, page: string): string[] {
  if (b.byResult.has(page) || b.byIngredient.has(page) || b.groupsOf.has(page)) return [page]
  return b.pageItems.get(page.toLowerCase())?.slice(0, 12) ?? []
}

// ---------- "Usado em" ----------

export interface Use {
  recipe: Recipe
  /** Quando o item entra pela regra de grupo (ex.: "Any Iron Bar") */
  via?: string
}

/** Receitas que usam o item, diretamente ou como parte de um grupo "Any ...". */
export function usesOf(b: RecipeBook, name: string): Use[] {
  const uses: Use[] = (b.byIngredient.get(name) ?? []).map((recipe) => ({ recipe }))
  const seen = new Set(uses.map((u) => u.recipe))
  for (const g of b.groupsOf.get(name) ?? []) {
    for (const recipe of b.byIngredient.get(g) ?? []) {
      if (!seen.has(recipe)) {
        seen.add(recipe)
        uses.push({ recipe, via: g })
      }
    }
  }
  return uses
}

// ---------- Receitas que valem para a árvore ----------

// Receitas que só "desfazem" outra (parede → bloco, plataforma → bloco, cerca → barra) ou trocam
// um item pelo parecido (Shimmer, Extratinador) não servem para montar a árvore: dariam voltas.
const LOOP_STATIONS = new Set(['Shimmer', 'Chlorophyte Extractinator'])
const DECRAFT_INGREDIENT = / (Wall|Platform|Fence|Shelf)$/

/** Receitas usadas na árvore de crafting. Um item sem nenhuma é "material básico". */
export function treeRecipes(b: RecipeBook, name: string): Recipe[] {
  return (b.byResult.get(name) ?? []).filter(
    (r) => !LOOP_STATIONS.has(r.station) && !r.ingredients.some((i) => DECRAFT_INGREDIENT.test(i.name)),
  )
}
