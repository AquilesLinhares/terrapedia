// Árvore de crafting automática: do item final até os materiais básicos.
//
// Escolhas do usuário (qual receita usar, qual item de um grupo "Any ...") valem para a árvore
// inteira e ficam salvas no aparelho (localStorage), para não precisar escolher de novo.

import { useSyncExternalStore } from 'react'
import { isGroup, treeRecipes, type Recipe, type RecipeBook } from './recipes'

export interface CraftChoices {
  /** Item → id da receita escolhida, ou NO_CRAFT para tratar como material */
  recipes: Record<string, number>
  /** Grupo ("Any Iron Bar") → item escolhido ("Lead Bar") */
  groups: Record<string, string>
}

/** "Não craftar": o item conta como material (ex.: você já tem). */
export const NO_CRAFT = -1

const KEY = 'terrapedia:craft-choices'
let choices: CraftChoices = { recipes: {}, groups: {} }
try {
  choices = { recipes: {}, groups: {}, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
} catch {
  // sem localStorage ou dado corrompido: começa do zero
}
const listeners = new Set<() => void>()

function save(next: CraftChoices) {
  choices = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // sem espaço ou bloqueado: vale até fechar a página
  }
  listeners.forEach((l) => l())
}

export function useCraftChoices() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => choices,
  )
}

export const craftChoices = {
  setRecipe(item: string, recipeId: number) {
    save({ ...choices, recipes: { ...choices.recipes, [item]: recipeId } })
  },
  setGroupItem(group: string, item: string) {
    save({ ...choices, groups: { ...choices.groups, [group]: item } })
  },
}

/** Item que entra no lugar de um grupo (o escolhido ou o primeiro). */
export function resolveGroup(b: RecipeBook, c: CraftChoices, name: string) {
  if (!isGroup(name)) return name
  const members = b.groups.get(name) ?? []
  const chosen = c.groups[name]
  return chosen && members.includes(chosen) ? chosen : (members[0] ?? name)
}

/** Receita usada para um item na árvore (null = material básico ou "não craftar"). */
export function chosenRecipe(b: RecipeBook, c: CraftChoices, name: string): Recipe | null {
  const options = treeRecipes(b, name)
  const id = c.recipes[name]
  if (id === NO_CRAFT) return null
  return options.find((r) => r.id === id) ?? options[0] ?? null
}

export interface TreeNode {
  /** Caminho na árvore (único), usado para abrir/fechar */
  key: string
  /** Item de verdade (já trocado pelo escolhido, se veio de um grupo) */
  name: string
  /** O grupo original, quando o ingrediente era "Any ..." */
  group?: string
  qty: number
  recipe: Recipe | null
  /** Quantas vezes a receita é feita */
  crafts: number
  children: TreeNode[]
  /** O item já aparece acima neste ramo: não expande de novo (evita voltas infinitas) */
  loop: boolean
}

const MAX_DEPTH = 25

/** Monta a árvore de `name` (quantidade `qty`). Cada ramo calcula só o que ele precisa. */
export function buildTree(b: RecipeBook, c: CraftChoices, name: string, qty = 1): TreeNode {
  function build(raw: string, qty: number, path: string, ancestors: Set<string>): TreeNode {
    const name = resolveGroup(b, c, raw)
    const key = `${path}/${raw}`
    const loop = ancestors.has(name) || ancestors.size >= MAX_DEPTH
    const recipe = loop ? null : chosenRecipe(b, c, name)
    const node: TreeNode = { key, name, group: raw !== name ? raw : undefined, qty, recipe, crafts: 0, children: [], loop }
    if (!recipe) return node
    node.crafts = Math.ceil(qty / recipe.amount)
    const next = new Set(ancestors).add(name)
    node.children = recipe.ingredients.map((ing, i) => build(ing.name, ing.amount * node.crafts, `${key}:${i}`, next))
    return node
  }
  return build(name, qty, '', new Set())
}

export interface Totals {
  /** Materiais básicos com a quantidade total */
  materials: { name: string; qty: number }[]
  /** Itens intermediários: quantos fazer de cada */
  crafted: { name: string; qty: number; recipe: Recipe }[]
  /** Bancadas usadas (texto como na receita: "Mythril Anvil", "By Hand"...) */
  stations: string[]
}

/**
 * Soma tudo o que a árvore pede. Diferente da árvore, aqui itens repetidos em ramos diferentes
 * são somados antes de arredondar (ex.: 2 ramos pedem 1 Tocha cada → 1 receita de 3 tochas, não 2).
 */
export function computeTotals(b: RecipeBook, c: CraftChoices, root: string, qty = 1): Totals {
  const rootName = resolveGroup(b, c, root)
  const recipeOf = new Map<string, Recipe | null>()
  const loopEdges = new Set<string>() // "pai>filho" que voltariam para um item acima
  const order: string[] = []
  const state = new Map<string, 'visiting' | 'done'>()

  // Percorre o grafo (DFS) e guarda a ordem: cada item aparece depois de tudo que ele usa
  function visit(name: string) {
    state.set(name, 'visiting')
    const recipe = chosenRecipe(b, c, name)
    recipeOf.set(name, recipe)
    for (const ing of recipe?.ingredients ?? []) {
      const child = resolveGroup(b, c, ing.name)
      const s = state.get(child)
      if (s === 'visiting') loopEdges.add(`${name}>${child}`)
      else if (!s) visit(child)
    }
    state.set(name, 'done')
    order.push(name)
  }
  visit(rootName)

  // Do topo para baixo: cada item sabe o total pedido por todos os pais antes de ser calculado
  const demand = new Map<string, number>([[rootName, qty]])
  const materials = new Map<string, number>()
  const crafted: Totals['crafted'] = []
  const stations = new Set<string>()
  const add = (map: Map<string, number>, k: string, v: number) => map.set(k, (map.get(k) ?? 0) + v)

  for (const name of order.reverse()) {
    const need = demand.get(name) ?? 0
    if (need <= 0) continue
    const recipe = recipeOf.get(name)
    if (!recipe) {
      add(materials, name, need)
      continue
    }
    const crafts = Math.ceil(need / recipe.amount)
    if (name !== rootName) crafted.push({ name, qty: need, recipe })
    stations.add(recipe.station)
    for (const ing of recipe.ingredients) {
      const child = resolveGroup(b, c, ing.name)
      add(loopEdges.has(`${name}>${child}`) ? materials : demand, child, ing.amount * crafts)
    }
  }

  const byQty = (a: { qty: number }, b: { qty: number }) => b.qty - a.qty
  return {
    materials: [...materials].map(([name, qty]) => ({ name, qty })).sort(byQty),
    crafted,
    stations: [...stations],
  }
}
