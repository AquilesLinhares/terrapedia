import { useState } from 'react'
import { ptName, stationParts, type Recipe, type RecipeBook } from '../lib/recipes'
import ItemChip from './ItemChip'

interface Props {
  book: RecipeBook
  recipes: Recipe[]
  /** Nomes a destacar nos ingredientes (o item do artigo, ou o grupo pelo qual ele entra) */
  highlight?: Set<string>
  /** Mostra só os primeiros; o resto aparece com "Mostrar todas" */
  limit?: number
}

/**
 * Tabela de receitas no estilo da wiki: Resultado | Ingredientes | Bancada.
 * No celular cada receita vira um cartão (resultado em cima, ingredientes e bancada embaixo).
 */
export default function RecipeList({ book, recipes, highlight, limit = Infinity }: Props) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? recipes : recipes.slice(0, limit)

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-line">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] bg-panel-2 text-sm font-semibold text-ink sm:grid">
        <span className="px-3 py-2">Resultado</span>
        <span className="px-3 py-2">Ingredientes</span>
        <span className="px-3 py-2">Bancada</span>
      </div>
      <ul className="m-0 list-none p-0">
        {visible.map((r) => (
          <li
            key={r.id}
            className="m-0 grid grid-cols-1 gap-2 border-t border-line/60 bg-panel/50 px-3 py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] sm:gap-0 sm:px-0 sm:py-0 sm:first:border-t"
          >
            <div className="sm:px-3 sm:py-2.5">
              <ItemChip book={book} name={r.result} amount={r.amount} size="lg" />
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 pl-2 sm:py-2.5 sm:pr-3 sm:pl-3">
              {r.ingredients.map((ing) => (
                <li key={ing.name} className="m-0">
                  <ItemChip book={book} name={ing.name} amount={ing.amount} showEn={false} highlight={highlight?.has(ing.name)} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-2 text-sm sm:py-2.5 sm:pr-3 sm:pl-3">
              <span className="text-xs text-muted sm:hidden">Bancada:</span>
              <Station book={book} station={r.station} />
            </div>
          </li>
        ))}
      </ul>
      {recipes.length > visible.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-t border-line bg-panel-2/60 py-2 text-sm font-semibold text-accent hover:bg-panel-2"
        >
          Mostrar todas ({recipes.length})
        </button>
      )}
    </div>
  )
}

/** "Bigorna de Ferro ou Bigorna de Chumbo" (+ "e Névoa Ecto"). */
export function Station({ book, station }: { book: RecipeBook; station: string }) {
  if (station === 'By Hand') return <span className="text-muted italic">{ptName(book, station)}</span>
  return (
    <>
      {stationParts(station).map((options, i) => (
        <span key={i} className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {i > 0 && <span className="text-muted">e</span>}
          {options.map((s, j) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              {j > 0 && <span className="text-xs text-muted italic">ou</span>}
              <ItemChip book={book} name={s} size="sm" showEn={false} />
            </span>
          ))}
        </span>
      ))}
    </>
  )
}
