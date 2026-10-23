// Peças comuns das Ferramentas: cabeçalho, escolha de etapa/classe e busca de itens.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { STAGES, type StageId } from '../lib/progression'
import { normalize } from '../lib/ptSearch'
import { ptName, type RecipeBook } from '../lib/recipes'
import { SET_NAMES, useToolClass, useToolStage } from '../lib/toolsData'
import { CLASS_LABELS, type PlayerClass } from '../lib/world'
import { ChevronLeftIcon, XIcon } from './icons'
import { Sprite } from './ItemChip'
import { articlePath } from './SearchBar'

export const cardClass = 'rounded-xl border border-line bg-panel p-4'
export const selectClass =
  'h-10 min-w-0 rounded-lg border border-line bg-bg px-2 text-sm text-ink focus:border-accent focus:outline-none'

export function ToolHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5">
      <Link to="/ferramentas" className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeftIcon className="h-4 w-4" /> Ferramentas
      </Link>
      <h1 className="font-display text-3xl font-bold text-gold">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </header>
  )
}

/** Etapa usada pela ferramenta: a do mundo ativo (só mostra) ou escolhida aqui. */
export function StagePicker() {
  const { stage, fromWorld, setStage } = useToolStage()
  const label = STAGES.find((s) => s.id === stage)?.label
  if (fromWorld)
    return (
      <p className="text-sm text-muted">
        Etapa do mundo ativo: <span className="font-semibold text-ink">{label}</span>{' '}
        <Link to="/mundo" className="text-accent hover:underline">
          mudar
        </Link>
      </p>
    )
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
      Etapa:
      <select value={stage} onChange={(e) => setStage(e.target.value as StageId)} className={selectClass}>
        {STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Escolha de classe (a da ficha do mundo vem marcada). */
export function ClassPicker({ value, onChange }: { value: PlayerClass | null; onChange: (c: PlayerClass) => void }) {
  const { playerClass: mine, fromWorld } = useToolClass()
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Classe">
      {(Object.keys(CLASS_LABELS) as PlayerClass[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            value === c ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-line text-muted hover:border-accent hover:text-ink'
          }`}
        >
          {CLASS_LABELS[c]}
          {fromWorld && mine === c && <span className="ml-1 text-xs text-accent">(sua)</span>}
        </button>
      ))}
    </div>
  )
}

/** Busca dentro de uma lista de itens (nome PT ou EN, sem acento). */
export function ItemPicker({
  book,
  names,
  onPick,
  placeholder = 'Buscar item (português ou inglês)',
}: {
  book: RecipeBook
  names: string[]
  onPick: (name: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const index = useMemo(() => names.map((en) => ({ en, pt: ptName(book, en), keys: [normalize(ptName(book, en)), normalize(en)] })), [book, names])
  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) return []
    const words = q.split(' ')
    return index
      .map((e) => {
        let score = 0
        for (const k of e.keys) {
          if (k === q) score = Math.max(score, 4)
          else if (k.startsWith(q)) score = Math.max(score, 3)
          else if (words.every((w) => k.split(' ').some((t) => t.startsWith(w)))) score = Math.max(score, 2)
          else if (k.includes(q)) score = Math.max(score, 1)
        }
        return { ...e, score }
      })
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score || a.pt.length - b.pt.length)
      .slice(0, 8)
  }, [index, query])

  const pick = (en: string) => {
    onPick(en)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center rounded-lg border border-line bg-bg focus-within:border-accent">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && results[0] && pick(results[0].en)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-ink placeholder:text-muted focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="px-3 text-muted hover:text-ink" aria-label="Limpar">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-lg border border-line bg-panel-2 py-1 shadow-xl">
          {results.map((r) => (
            <li key={r.en}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.en)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-panel"
              >
                <Sprite book={book} name={r.en} size="sm" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-medium text-ink">{r.pt}</span>
                  {r.pt !== r.en && <span className="block truncate text-xs text-muted">{r.en}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && results.length === 0 && (
        <p className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-muted">
          Nenhum item encontrado.
        </p>
      )}
    </div>
  )
}

/** Nome PT de um item ou conjunto de armadura ("Spooky armor" → "Armadura Assustadora"). */
export const toolName = (book: RecipeBook, en: string) => SET_NAMES[en] ?? ptName(book, en)

/** Conjunto de armadura clicável: sprite da primeira peça + nome PT (+ EN). */
export function SetChip({ book, set, icon, showEn = true }: { book: RecipeBook; set: string; icon: string; showEn?: boolean }) {
  return (
    <Link to={articlePath(set)} className="group inline-flex min-w-0 items-center gap-2">
      <Sprite book={book} name={icon} />
      <span className="min-w-0 leading-tight">
        <span className="font-medium text-accent group-hover:underline">{toolName(book, set)}</span>
        {showEn && <span className="block truncate text-xs text-muted">{set}</span>}
      </span>
    </Link>
  )
}

export function Loading() {
  return <p className="py-10 text-center text-muted">Carregando…</p>
}
