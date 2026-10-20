import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSuggestions, type Suggestion } from '../lib/wikiApi'

export function articlePath(title: string) {
  return `/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

interface Props {
  autoFocus?: boolean
  large?: boolean
}

export default function SearchBar({ autoFocus, large }: Props) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Espera o usuário parar de digitar por 200ms antes de perguntar à wiki ("debounce").
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        setSuggestions(await fetchSuggestions(q, controller.signal))
        setActive(-1)
      } catch {
        // pedido cancelado ou sem internet: só ignora
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function go(title: string) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(articlePath(title))
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const chosen = suggestions[active]?.title ?? query.trim()
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
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Buscar item, inimigo, bioma..."
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
            <li key={s.title} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s.title)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-accent/15 text-ink' : 'text-ink/90'}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg/60">
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt="" className="pixelated max-h-8 max-w-8 object-contain" loading="lazy" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-line" />
                  )}
                </span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
