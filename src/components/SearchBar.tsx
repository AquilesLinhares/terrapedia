import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchSuggestions, WIKI_BASE } from '../lib/wikiApi'
import { displayName, loadDictionary, normalize, searchDictionary, STOPWORDS } from '../lib/ptSearch'
import { searchGuides } from '../lib/guides'
import { loadGameNames } from '../lib/localize'
import { prefetchArticle } from '../lib/articleLoader'
import { useRecent } from '../lib/recent'
import { listen, voiceSupported } from '../lib/voiceSearch'
import { MicIcon } from './icons'

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
  /** Por que apareceu (busca por descrição: as etiquetas que bateram) */
  hint?: string
}

const thumbnailFor = (type: string, en: string) =>
  SPRITE_TYPES.has(type) ? `${WIKI_BASE}/images/${encodeURIComponent(en.replace(/ /g, '_'))}.png` : undefined

interface Props {
  autoFocus?: boolean
  large?: boolean
}

export default function SearchBar({ autoFocus, large }: Props) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [local, setLocal] = useState<Suggestion[]>([])
  const [byTags, setByTags] = useState<{ list: Suggestion[]; complete: boolean }>({ list: [], complete: false })
  const [remote, setRemote] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recentPages = useRecent()
  const skipAutoOpen = useRef(!!autoFocus)

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
          thumbnail: thumbnailFor(m.type, m.en),
        })),
      )
      setActive(-1)
    })
    // Busca por descrição nas etiquetas das páginas reorganizadas ("peneira de limo" → Extrator)
    searchGuides(query, 3).then((matches) => {
      if (cancelled) return
      setByTags({
        list: matches.map((g) => ({
          page: g.page,
          label: displayName({ pt: g.pt ?? g.page, en: g.page }),
          type: g.type,
          thumbnail: thumbnailFor(g.type, g.page),
          hint: `pela descrição: ${g.matched.slice(0, 3).join(', ')}`,
        })),
        complete: matches[0]?.complete === true,
      })
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
        const [results, names] = await Promise.all([fetchSuggestions(q, controller.signal), loadGameNames()])
        // Títulos da wiki com o nome oficial em português, quando existe
        setRemote(
          results.map((s) => ({
            page: s.title,
            label: displayName({ pt: names.lower.get(s.title.toLowerCase()) ?? s.title, en: s.title }),
            thumbnail: s.thumbnail,
          })),
        )
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

  // Junta tudo, sem repetir páginas: dicionário e descrição primeiro, wiki depois.
  const localPages = new Set(local.map((s) => s.page.split('#')[0].toLowerCase()))
  const tagged = byTags.list.filter((s) => !localPages.has(s.page.toLowerCase()))
  const ownPages = new Set([...localPages, ...tagged.map((s) => s.page.toLowerCase())])
  // A descrição vem antes dos nomes quando bateu inteira e a busca tem várias palavras,
  // ou quando nenhum nome começa com a palavra digitada ("peneira" não é nome de nada)
  const words = normalize(query).split(' ').filter((w) => w && !STOPWORDS.has(w))
  const nameStartsWith = local.some((s) => normalize(s.label).split(' ').some((t) => t.startsWith(words[0] ?? '')))
  const tagsFirst = byTags.complete && (words.length > 1 || !nameStartsWith)
  // Busca vazia: as últimas páginas abertas (histórico)
  const showRecent = query.trim() === ''
  const suggestions: Suggestion[] = showRecent
    ? recentPages.slice(0, 8).map((p) => ({ page: p.page, label: displayName({ pt: p.pt ?? p.en, en: p.en }), thumbnail: p.sprite }))
    : [
        ...(tagsFirst ? [...tagged, ...local] : [...local.slice(0, 8 - tagged.length), ...tagged]),
        ...remote.filter((s) => !ownPages.has(s.page.toLowerCase())),
      ].slice(0, 8)

  // A sugestão escolhida (setas ou mouse) já começa a baixar, para abrir mais rápido no Enter/clique
  const activePage = suggestions[active]?.page
  useEffect(() => {
    if (!activePage) return
    const timer = setTimeout(() => prefetchArticle(activePage), 150)
    return () => clearTimeout(timer)
  }, [activePage])

  // Busca por voz: o que a pessoa fala vai aparecendo na caixa e as sugestões acompanham
  const [listening, setListening] = useState(false)
  const stopVoice = useRef<(() => void) | null>(null)
  useEffect(() => () => stopVoice.current?.(), [])

  function toggleVoice() {
    if (listening) return stopVoice.current?.()
    setListening(true)
    stopVoice.current = listen(
      (text) => {
        setQuery(text)
        setOpen(true)
      },
      (error) => {
        setListening(false)
        stopVoice.current = null
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          alert('O navegador não deixou usar o microfone. Libere o acesso nas configurações do site e tente de novo.')
        }
      },
    )
  }

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
    if (showRecent && active < 0) return // busca vazia: Enter não abre o histórico sozinho
    const chosen = suggestions[active]?.page ?? suggestions[0]?.page ?? query.trim()
    if (chosen) go(chosen)
  }

  const showList = open && (showRecent ? suggestions.length > 0 : suggestions.length > 0 || !loading)

  return (
    <form onSubmit={onSubmit} role="search" className={`relative min-w-0 ${large ? 'w-full' : 'flex-1'}`}>
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
            // O foco automático da página inicial não abre a lista (ela cobriria a tela); clicar ou digitar abre
            if (skipAutoOpen.current) skipAutoOpen.current = false
            else setOpen(true)
            // Já começa a baixar o dicionário, mas só quando o navegador estiver livre (não trava a primeira tela)
            ;(window.requestIdleCallback ?? setTimeout)(() => loadDictionary())
          }}
          onClick={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          data-search-input
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
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Parar de ouvir' : 'Buscar por voz'}
            title={listening ? 'Parar de ouvir' : 'Buscar por voz'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
              listening ? 'animate-pulse bg-red-500/20 text-red-300' : 'text-muted hover:bg-bg/60 hover:text-ink'
            }`}
          >
            <MicIcon className="h-5 w-5" />
          </button>
        )}
        {!query && !listening && (
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-sans text-[11px] text-muted sm:pointer-fine:inline" title="Atalho para abrir a busca">
            Ctrl K
          </kbd>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-panel py-1 shadow-2xl shadow-black/50"
        >
          {showRecent && (
            <li role="presentation" className="px-3 pt-1.5 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
              Abertas recentemente
            </li>
          )}
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{s.label}</span>
                  {s.hint && <span className="block truncate text-xs text-muted">{s.hint}</span>}
                </span>
                {s.type && s.type !== 'página' && (
                  <span className="shrink-0 rounded bg-bg/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">
                    {s.type}
                  </span>
                )}
              </button>
            </li>
          ))}
          {showRecent && (
            <li role="presentation" className="border-t border-line">
              <Link
                to="/historico"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-semibold text-accent hover:underline"
              >
                Ver histórico completo
              </Link>
            </li>
          )}
        </ul>
      )}
    </form>
  )
}
