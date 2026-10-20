import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSuggestions, WIKI_BASE } from '../lib/wikiApi'
import { displayName, loadDictionary, searchDictionary } from '../lib/ptSearch'

/** Caminho no app para uma página da wiki. Aceita "Título#Seção". */
export function articlePath(page: string) {
  const [title, section] = page.split('#')
  const path = `/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
  return section ? `${path}#${encodeURIComponent(section.replace(/ /g, '_'))}` : path
}

// Tipos que têm sprite com o mesmo nome do item/NPC na wiki (ex.: "Copper Shortsword.png")
const SPRITE_TYPES = new Set(['item', 'npc', 'chefe'])

interface Suggestion {
  /** Página que abre ao clicar */
  page: string
  label: string
  type?: string
  thumbnail?: string
}

interface Props {
  autoFocus?: boolean
  large?: boolean
}

export default function SearchBar({ autoFocus, large }: Props) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [local, setLocal] = useState<Suggestion[]>([])
  const [remote, setRemote] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Resultados do dicionário PT ↔ EN: instantâneos, sem internet.
  useEffect(() => {
    let cancelled = false
    searchDictionary(query, 6).then((matches) => {
      if (cancelled) return
      setLocal(
        matches.map((m) => ({
          page: m.page,
          label: displayName(m),
          type: m.type,
          thumbnail: SPRITE_TYPES.has(m.type)
            ? `${WIKI_BASE}/images/${encodeURIComponent(m.en.replace(/ /g, '_'))}.png`
            : undefined,
        })),
      )
      setActive(-1)
    })
    return () => {
      cancelled = true
    }
  }, [query])

  // Resultados da wiki: espera o usuário parar de digitar por 250ms ("debounce").
  useEffect(() => {
    const q = query.trim()
    setRemote([])
    if (!q) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await fetchSuggestions(q, controller.signal)
        setRemote(results.map((s) => ({ page: s.title, label: s.title, thumbnail: s.thumbnail })))
      } catch {
        // pedido cancelado ou sem internet: o dicionário local continua funcionando
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Junta os dois, sem repetir páginas: dicionário primeiro, wiki depois.
  const localPages = new Set(local.map((s) => s.page.split('#')[0].toLowerCase()))
  const suggestions = [...local, ...remote.filter((s) => !localPages.has(s.page.toLowerCase()))].slice(0, 8)

  function go(page: string) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(articlePath(page))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Enter abre a sugestão escolhida; se nenhuma foi escolhida, a primeira da lista.
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const chosen = suggestions[active]?.page ?? suggestions[0]?.page ?? query.trim()
    if (chosen) go(chosen)
  }

  const showList = open && query.trim() !== '' && (suggestions.length > 0 || !loading)

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full">
      <div
        className={`flex items-center gap-2 rounded-xl border border-line bg-panel/90 px-3 shadow-lg shadow-black/30 transition focus-within:border-accent ${
          large ? 'h-14' : 'h-11'
        }`}
      >
        <svg className="h-5 w-5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            loadDictionary() // já começa a baixar o dicionário
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Buscar em português ou inglês..."
          aria-label="Buscar na wiki"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showList}
          role="combobox"
          autoComplete="off"
          enterKeyHint="search"
          className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none ${large ? 'text-lg' : 'text-base'}`}
        />
        {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-muted border-t-accent" />}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-panel py-1 shadow-2xl shadow-black/50"
        >
          {suggestions.length === 0 && <li className="px-4 py-3 text-sm text-muted">Nenhuma sugestão. Aperte Enter para buscar.</li>}
          {suggestions.map((s, i) => (
            <li key={s.page} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s.page)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-accent/15 text-ink' : 'text-ink/90'}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg/60">
                  {s.thumbnail ? (
                    <img
                      src={s.thumbnail}
                      alt=""
                      className="pixelated max-h-8 max-w-8 object-contain"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-line" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {s.type && s.type !== 'página' && (
                  <span className="shrink-0 rounded bg-bg/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">
                    {s.type}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
