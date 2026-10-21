import { useEffect } from 'react'
import { recent, useRecent } from '../lib/recent'
import { EmptyState, PageHeading } from '../components/PageHeading'
import SavedArticleRow, { RowButton } from '../components/SavedArticleRow'
import { ClockIcon, TrashIcon } from '../components/icons'

export default function HistoryPage() {
  const pages = useRecent()

  useEffect(() => {
    document.title = 'Histórico · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeading title="Histórico" subtitle={pages.length > 0 ? 'Últimas páginas abertas neste aparelho' : undefined}>
        {pages.length > 0 && (
          <button
            type="button"
            onClick={() => confirm('Apagar o histórico deste aparelho?') && recent.clear()}
            className="h-9 rounded-full border border-line bg-panel px-4 text-sm font-semibold text-muted transition hover:border-red-400 hover:text-red-300"
          >
            Limpar histórico
          </button>
        )}
      </PageHeading>
      {pages.length === 0 ? (
        <EmptyState icon={<ClockIcon className="h-10 w-10" />}>As páginas que você abrir aparecem aqui.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <SavedArticleRow
              key={p.page}
              article={p}
              trailing={
                <>
                  <span className="hidden shrink-0 text-xs text-muted sm:inline">{whenLabel(p.at)}</span>
                  <RowButton onClick={() => recent.remove(p.page)} label="Tirar do histórico">
                    <TrashIcon className="h-5 w-5" />
                  </RowButton>
                </>
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/** "hoje 14:05", "ontem", "12/10" */
function whenLabel(iso: string) {
  const date = new Date(iso)
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return `hoje ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  if (days === 1) return 'ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
