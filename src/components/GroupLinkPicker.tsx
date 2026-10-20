import { useEffect } from 'react'
import { hasLink, library, type Group, type SavedArticle } from '../lib/library'
import { itemsForPage, type RecipeBook } from '../lib/recipes'
import { CheckIcon } from './icons'

/** A receita de algum item da página `to` usa algum item da página `from` (direto ou por grupo "Any ...")? */
export function recipeUses(book: RecipeBook, from: string, to: string) {
  const fromItems = itemsForPage(book, from)
  if (!fromItems.length) return false
  const accepted = new Set(fromItems.flatMap((i) => [i, ...(book.groupsOf.get(i) ?? [])]))
  return itemsForPage(book, to).some((item) =>
    (book.byResult.get(item) ?? []).some((r) => r.ingredients.some((ing) => accepted.has(ing.name))),
  )
}

/** Ligações que as receitas da wiki sugerem entre os itens do grupo. */
export function suggestedLinks(book: RecipeBook, group: Group) {
  return group.items.flatMap((from) =>
    group.items.filter((to) => to.page !== from.page && recipeUses(book, from.page, to.page)).map((to) => ({ from: from.page, to: to.page })),
  )
}

interface Props {
  group: Group
  item: SavedArticle
  book: RecipeBook | null
  onClose: () => void
}

/** Janela "Usar X para craftar…": marca em quais itens do grupo o item entra. */
export default function GroupLinkPicker({ group, item, book, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Os que a receita confirma aparecem primeiro
  const targets = group.items
    .filter((t) => t.page !== item.page)
    .map((t) => ({ target: t, byRecipe: !!book && recipeUses(book, item.page, t.page) }))
    .sort((a, b) => Number(b.byRecipe) - Number(a.byRecipe))
  const name = item.pt ?? item.en

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Usar ${name} para craftar`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-line bg-panel p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 sm:rounded-2xl sm:pb-4"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="min-w-0 font-display text-lg font-bold text-gold">
            Usar <span className="text-ink">{name}</span> para craftar…
          </h2>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted hover:text-ink">
            Fechar
          </button>
        </div>
        <p className="mb-3 text-sm text-muted">Marque os itens do grupo em que ele entra. Isso monta a árvore do grupo.</p>

        {targets.length === 0 ? (
          <p className="text-sm text-muted">Coloque outros artigos neste grupo para poder ligá-los.</p>
        ) : (
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {targets.map(({ target, byRecipe }) => {
              const linked = hasLink(group, item.page, target.page)
              return (
                <li key={target.page}>
                  <button
                    type="button"
                    onClick={() => library.toggleLink(group.id, item.page, target.page)}
                    aria-pressed={linked}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-bg/50"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        linked ? 'border-gold bg-gold text-bg' : 'border-line'
                      }`}
                    >
                      {linked && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {target.sprite && <img src={target.sprite} alt="" className="pixelated max-h-8 max-w-8 object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{target.pt ?? target.en}</span>
                      {byRecipe && <span className="block text-xs text-gold/80">a receita usa este item</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
