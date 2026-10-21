import { useEffect, useState } from 'react'
import { NOTE_MAX, useNotes } from '../lib/notes'
import { activeWorld, useWorld } from '../lib/world'
import { PencilIcon } from './icons'

type Tab = 'mine' | 'world'

/** Notas de um artigo: "Minha nota" (só eu) e "Nota do mundo" (membros do mundo ativo). */
export default function NoteBox({ page }: { page: string }) {
  const notes = useNotes(page)
  const worldState = useWorld()
  const worldName = activeWorld(worldState)?.name
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('mine')
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | string>('idle')

  const saved = tab === 'mine' ? notes.mine : (notes.worldNote?.body ?? '')
  const hasAny = !!notes.mine || !!notes.worldNote

  // Nota que já existe aparece aberta; trocar de página fecha e volta pra "Minha nota"
  useEffect(() => {
    setOpen(false)
    setTab('mine')
  }, [page])
  useEffect(() => {
    if (notes.ready && hasAny) setOpen(true)
  }, [notes.ready, hasAny])
  // O texto da caixa acompanha a nota salva (ao trocar de aba ou quando outro membro muda a do mundo)
  useEffect(() => {
    setDraft(saved)
  }, [saved, tab])
  useEffect(() => {
    setStatus('idle')
  }, [tab, page])
  // Sem mundo ativo, só existe "Minha nota"
  useEffect(() => {
    if (!notes.worldId) setTab('mine')
  }, [notes.worldId])

  if (!notes.ready) return null

  async function save() {
    setStatus('saving')
    const error = tab === 'mine' ? await notes.saveMine(draft) : await notes.saveWorld(draft)
    setStatus(error ?? 'saved')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 text-sm text-muted transition hover:border-accent hover:text-ink"
      >
        <PencilIcon className="h-4 w-4" />
        Adicionar nota
      </button>
    )
  }

  const dirty = draft.trim() !== saved
  const editor = notes.worldNote?.updatedBy ? worldState.members.find((m) => m.userId === notes.worldNote?.updatedBy)?.name : undefined

  return (
    <section className="mb-5 rounded-xl border border-line bg-panel/70 p-3" aria-label="Notas">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-line bg-bg/50 p-0.5 text-sm font-semibold" role="tablist">
          {(['mine', 'world'] as const)
            .filter((t) => t === 'mine' || notes.worldId)
            .map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`h-7 rounded-full px-3 transition ${tab === t ? 'bg-gold text-bg' : 'text-muted hover:text-ink'}`}
              >
                {t === 'mine' ? 'Minha nota' : 'Nota do mundo'}
                {(t === 'mine' ? notes.mine : notes.worldNote) && tab !== t && <span className="ml-1 text-gold">•</span>}
              </button>
            ))}
        </div>
        {!hasAny && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
            Fechar
          </button>
        )}
      </div>

      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setStatus('idle')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && dirty) void save()
        }}
        maxLength={NOTE_MAX}
        rows={3}
        placeholder={tab === 'mine' ? 'Ex.: preciso de 3 desses para a armadura' : 'Ex.: o baú com isso fica na base da selva'}
        className="block w-full resize-y rounded-lg border border-line bg-bg/60 px-3 py-2 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none sm:text-sm"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p>
          {tab === 'mine'
            ? notes.synced
              ? 'Só você vê. Fica na sua conta.'
              : 'Só você vê. Salva neste aparelho (entre na conta para ter em todos).'
            : `Todos do mundo ${worldName ?? ''} veem e podem editar.`}
          {tab === 'world' && notes.worldNote && (
            <> Última edição{editor && ` por ${editor}`} em {new Date(notes.worldNote.updatedAt).toLocaleDateString('pt-BR')}.</>
          )}
        </p>
        <div className="flex items-center gap-2">
          {status === 'saved' && !dirty && <span className="text-gold">Salvo</span>}
          {status !== 'idle' && status !== 'saved' && status !== 'saving' && <span className="text-red-400">{status}</span>}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || status === 'saving'}
            className="h-8 rounded-full bg-gold px-4 text-sm font-semibold text-bg transition disabled:opacity-40"
          >
            {status === 'saving' ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </section>
  )
}
