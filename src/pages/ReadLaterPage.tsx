import { useEffect } from 'react'
import { library, useLibrary, type ReadLaterItem } from '../lib/library'
import { EmptyState, PageHeading } from '../components/PageHeading'
import SavedArticleRow, { RowButton } from '../components/SavedArticleRow'
import { CheckIcon, ClockIcon, TrashIcon } from '../components/icons'

export default function ReadLaterPage() {
  const { readLater } = useLibrary()
  // Os que faltam ver ficam em cima; os já vistos descem
  const pending = readLater.filter((r) => !r.seen)
  const seen = readLater.filter((r) => r.seen)

  useEffect(() => {
    document.title = 'Buscar depois · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeading
        title="Buscar depois"
        subtitle={readLater.length > 0 ? `${pending.length} para ver · ${seen.length} já visto(s)` : undefined}
      >
        {seen.length > 0 && (
          <button
            type="button"
            onClick={() => library.clearSeen()}
            className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm text-muted transition hover:border-accent hover:text-ink"
          >
            <TrashIcon className="h-4 w-4" />
            Limpar vistos
          </button>
        )}
      </PageHeading>

      {readLater.length === 0 ? (
        <EmptyState icon={<ClockIcon className="h-10 w-10" />}>
          Achou algo pra ler mais tarde? Toque em <strong className="text-ink">Ver depois</strong> no topo do artigo em
          vez de deixar a aba aberta.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {[...pending, ...seen].map((item) => (
            <ReadLaterRow key={item.page} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReadLaterRow({ item }: { item: ReadLaterItem }) {
  return (
    <SavedArticleRow
      article={item}
      dimmed={item.seen}
      leading={
        <label className="flex h-10 w-8 shrink-0 cursor-pointer items-center justify-center" title="Já vi">
          <input
            type="checkbox"
            checked={item.seen}
            onChange={(e) => library.setSeen(item.page, e.target.checked)}
            className="peer sr-only"
            aria-label={`Já vi: ${item.pt ?? item.en}`}
          />
          <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md border-2 border-line text-bg transition peer-checked:border-gold peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            {item.seen && <CheckIcon className="h-4 w-4" />}
          </span>
        </label>
      }
      trailing={
        <RowButton onClick={() => library.toggleReadLater(item)} label="Tirar da lista">
          <TrashIcon className="h-5 w-5" />
        </RowButton>
      }
    />
  )
}
