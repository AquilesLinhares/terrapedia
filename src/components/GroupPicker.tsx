import { useEffect, useState } from 'react'
import { groupHas, library, useLibrary, type ArticleRef } from '../lib/library'
import { useWorld } from '../lib/world'
import { CheckIcon, PlusIcon } from './icons'

/**
 * Janela para escolher em quais grupos o artigo fica.
 * No celular ela sobe do rodapé (fácil de alcançar com o polegar); no PC fica no meio.
 */
export default function GroupPicker({ article, onClose }: { article: ArticleRef; onClose: () => void }) {
  const { activeId } = useWorld()
  // Grupos pessoais e os do mundo ativo
  const groups = useLibrary().groups.filter((g) => !g.worldId || g.worldId === activeId)
  const [name, setName] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function createGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const id = library.createGroup(name)
    library.toggleInGroup(id, article)
    setName('')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adicionar a um grupo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-line bg-panel p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 sm:rounded-2xl sm:pb-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-gold">Adicionar a um grupo</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted hover:text-ink">
            Fechar
          </button>
        </div>

        {groups.length === 0 ? (
          <p className="mb-3 text-sm text-muted">Você ainda não tem grupos. Crie o primeiro abaixo.</p>
        ) : (
          <ul className="mb-3 max-h-[45vh] space-y-1 overflow-y-auto">
            {groups.map((g) => {
              const inGroup = groupHas(g, article.page)
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => library.toggleInGroup(g.id, article)}
                    aria-pressed={inGroup}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-bg/50"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        inGroup ? 'border-gold bg-gold text-bg' : 'border-line'
                      }`}
                    >
                      {inGroup && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{g.name}</span>
                    {g.worldId && <span className="shrink-0 rounded-full bg-accent/15 px-2 text-xs font-semibold text-accent">mundo</span>}
                    <span className="shrink-0 text-xs text-muted">{g.items.length}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <form onSubmit={createGroup} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Novo grupo (ex.: Preparar Moon Lord)"
            aria-label="Nome do novo grupo"
            maxLength={60}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg/60 px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-semibold text-bg transition disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            Criar
          </button>
        </form>
      </div>
    </div>
  )
}
