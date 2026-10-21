import { Link } from 'react-router-dom'
import { itemsForPage, ptName, treeRecipes, usesOf, type Recipe, type RecipeBook, type Use } from '../lib/recipes'
import RecipeList from './RecipeList'
import { TreeIcon } from './icons'

export interface Crafting {
  /** Itens do artigo (normalmente só um) */
  items: string[]
  recipes: Recipe[]
  uses: Use[]
}

/** Receitas e "Usado em" de um artigo. `null` se o artigo não tem nada de crafting. */
export function craftingFor(book: RecipeBook, page: string): Crafting | null {
  const items = itemsForPage(book, page)
  // Receitas "normais" primeiro; trocas (Shimmer, Extrator) e "desfazer" (parede → bloco) no fim
  const recipes = items.flatMap((i) => {
    const all = book.byResult.get(i) ?? []
    const main = new Set(treeRecipes(book, i))
    return [...all.filter((r) => main.has(r)), ...all.filter((r) => !main.has(r))]
  })
  const seen = new Set<Recipe>()
  const uses = items
    .flatMap((i) => usesOf(book, i))
    .filter((u) => !seen.has(u.recipe) && !!seen.add(u.recipe))
  return recipes.length || uses.length ? { items, recipes, uses } : null
}

/** Endereço da árvore de crafting de um item. */
export function treePath(item: string) {
  return `/arvore/${encodeURIComponent(item.replace(/ /g, '_'))}`
}

interface Props {
  book: RecipeBook
  crafting: Crafting
  /** Só uma parte, sem o subtítulo (as páginas reorganizadas têm seções separadas) */
  only?: 'recipes' | 'uses'
}

/** Seção "Crafting" do artigo: receitas, botão da árvore e "Usado em". */
export default function CraftingSection({ book, crafting, only }: Props) {
  const { items } = crafting
  const recipes = only === 'uses' ? [] : crafting.recipes
  const uses = only === 'recipes' ? [] : crafting.uses
  const withTree = only === 'uses' ? [] : items.filter((i) => treeRecipes(book, i).length > 0)
  const highlight = new Set([...items, ...uses.flatMap((u) => (u.via ? [u.via] : []))])

  return (
    <div className="crafting-app">
      {withTree.length > 0 && (
        <div className="my-3 flex flex-wrap gap-2">
          {withTree.map((item) => (
            <Link
              key={item}
              to={treePath(item)}
              className="inline-flex h-9 items-center rounded-full border border-gold/60 bg-gold/15 px-3.5 text-sm font-semibold transition hover:bg-gold/25"
            >
              <span className="inline-flex items-center gap-1.5 text-gold">
                <TreeIcon className="h-4 w-4" />
                {withTree.length > 1 ? `Árvore: ${ptName(book, item)}` : 'Ver árvore'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {recipes.length > 0 && (
        <>
          {!only && <h3>Receitas</h3>}
          <RecipeList book={book} recipes={recipes} limit={12} />
        </>
      )}

      {uses.length > 0 && (
        <>
          {!only && <h3>Usado em</h3>}
          {uses.some((u) => u.via) && (
            <p className="text-sm text-muted">
              Em destaque: este item, ou o grupo em que ele entra (ex.: “Qualquer Barra de Ferro”).
            </p>
          )}
          <RecipeList book={book} recipes={uses.map((u) => u.recipe)} highlight={highlight} limit={10} />
        </>
      )}
    </div>
  )
}

