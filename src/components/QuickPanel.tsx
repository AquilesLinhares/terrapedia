// Conteúdo da janelinha flutuante (desenhado dentro dela por `QuickWindowHost`).
// Mini busca no topo, a lista da aba escolhida no meio e as abas embaixo, num "dock" de vidro.
// Leve de propósito: só sprites pequenos, sem buscar nada na wiki e sem atualizar sozinho
// (as listas mudam quando a biblioteca ou o mundo mudam no app).

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { library, useLibrary, type ArticleRef } from '../lib/library'
import { activeWorld, MODE_LABELS, useWorld, useWorldStage } from '../lib/world'
import { useAuth } from '../lib/auth'
import { MILESTONES } from '../lib/progression'
import { loadDictionary, searchDictionary, type DictMatch } from '../lib/ptSearch'
import { prefetchArticle } from '../lib/articleLoader'
import { WIKI_BASE } from '../lib/wikiApi'
import { articlePath } from './SearchBar'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, GlobeIcon, PinIcon, StarIcon, XIcon } from './icons'

type Tab = 'quick' | 'favorites' | 'later' | 'world'
const TAB_KEY = 'terrapedia:quick-tab'
const TABS: { id: Tab; label: string; icon: typeof StarIcon }[] = [
  { id: 'quick', label: 'Rápido', icon: PinIcon },
  { id: 'favorites', label: 'Favoritos', icon: StarIcon },
  { id: 'later', label: 'Depois', icon: ClockIcon },
  { id: 'world', label: 'Mundo', icon: GlobeIcon },
]

// Mesmos tipos da busca principal: o sprite tem o nome do item/NPC
const SPRITE_TYPES = new Set(['item', 'npc', 'chefe'])
const spriteOf = (m: DictMatch) =>
  SPRITE_TYPES.has(m.type) ? `${WIKI_BASE}/images/${encodeURIComponent(m.en.replace(/ /g, '_'))}.png` : undefined

function savedTab(): Tab {
  try {
    const tab = localStorage.getItem(TAB_KEY) as Tab | null
    return tab && TABS.some((t) => t.id === tab) ? tab : 'quick'
  } catch {
    return 'quick'
  }
}

export default function QuickPanel() {
  const navigate = useNavigate()
  const lib = useLibrary()
  const [tab, setTab] = useState<Tab>(savedTab)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DictMatch[]>([])

  useEffect(() => {
    let cancelled = false
    if (!query.trim()) return setResults([])
    searchDictionary(query, 6).then((m) => !cancelled && setResults(m))
    return () => {
      cancelled = true
    }
  }, [query])

  function chooseTab(next: Tab) {
    setTab(next)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      // sem localStorage: volta para "Rápido" na próxima vez
    }
  }

  /** Abre na janela principal; a janelinha continua aberta. */
  function open(path: string) {
    navigate(path)
    window.focus() // o navegador pode ignorar (ex.: o jogo está na frente)
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const page = results[0]?.page ?? query.trim()
    if (!page) return
    setQuery('')
    open(articlePath(page))
  }

  const unseen = lib.readLater.filter((r) => !r.seen).length

  return (
    <div className="flex h-dvh flex-col gap-2 p-2 text-ink select-none">
      <form onSubmit={onSearch} role="search" className="glass flex h-9 shrink-0 items-center gap-2 rounded-full px-3">
        <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => void loadDictionary()}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Buscar..."
          aria-label="Buscar na wiki"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted focus:outline-none"
        />
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {query.trim() ? (
          <List empty="Nada no dicionário. Enter abre a página com esse nome.">
            {results.map((m) => (
              <Row
                key={m.page + m.pt}
                item={{ page: m.page, en: m.en, pt: m.pt, sprite: spriteOf(m) }}
                onOpen={() => {
                  setQuery('')
                  open(articlePath(m.page))
                }}
              />
            ))}
          </List>
        ) : tab === 'quick' ? (
          <List empty="Nada fixado ainda. Abra uma página no app e toque em “Fixar”.">
            {lib.quick.map((item, i) => (
              <Row
                key={item.page}
                item={item}
                onOpen={() => open(articlePath(item.page))}
                actions={
                  <>
                    <IconButton label="Subir" disabled={i === 0} onClick={() => library.moveQuick(item.page, -1)}>
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Descer" disabled={i === lib.quick.length - 1} onClick={() => library.moveQuick(item.page, 1)}>
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton label="Tirar do acesso rápido" onClick={() => library.toggleQuick(item)}>
                      <XIcon className="h-3.5 w-3.5" />
                    </IconButton>
                  </>
                }
              />
            ))}
          </List>
        ) : tab === 'favorites' ? (
          <List empty="Nenhum favorito ainda.">
            {lib.favorites.map((item) => (
              <Row key={item.page} item={item} onOpen={() => open(articlePath(item.page))} />
            ))}
          </List>
        ) : tab === 'later' ? (
          <List empty="A lista “Buscar depois” está vazia.">
            {lib.readLater.map((item) => (
              <Row
                key={item.page}
                item={item}
                dimmed={item.seen}
                onOpen={() => open(articlePath(item.page))}
                actions={
                  <IconButton label={item.seen ? 'Marcar como não visto' : 'Marcar como já visto'} active={item.seen} onClick={() => library.setSeen(item.page, !item.seen)}>
                    <CheckIcon className="h-3.5 w-3.5" />
                  </IconButton>
                }
                alwaysShowActions
              />
            ))}
          </List>
        ) : (
          <WorldTab open={open} />
        )}
      </div>

      {/* Abas num "dock": o ícone cresce um pouco ao passar o mouse */}
      <nav className="glass mx-auto flex shrink-0 gap-0.5 rounded-2xl p-1" aria-label="Abas do acesso rápido">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id && !query.trim()
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setQuery('')
                chooseTab(id)
              }}
              aria-pressed={active}
              className={`group flex h-11 w-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition ${
                active ? 'bg-white/12 text-gold' : 'text-muted hover:text-ink'
              }`}
            >
              <span className="relative transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:scale-115">
                <Icon className="h-5 w-5" filled={active} />
                {id === 'later' && unseen > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-3.5 rounded-full bg-gold px-0.5 text-center text-[9px] leading-3.5 font-bold text-bg">
                    {unseen > 99 ? '99+' : unseen}
                  </span>
                )}
              </span>
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function List({ empty, children }: { empty: string; children: React.ReactNode[] }) {
  if (children.length === 0) return <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted">{empty}</p>
  return <ul className="space-y-0.5">{children}</ul>
}

interface RowProps {
  item: ArticleRef
  onOpen: () => void
  actions?: React.ReactNode
  /** Botões sempre visíveis (sem isso, aparecem ao passar o mouse) */
  alwaysShowActions?: boolean
  dimmed?: boolean
}

function Row({ item, onOpen, actions, alwaysShowActions, dimmed }: RowProps) {
  const hasPt = !!item.pt && item.pt !== item.en
  const timer = useRef(0)
  return (
    <li className={`group flex items-center gap-1 rounded-xl pr-1 transition hover:bg-white/[0.07] ${dimmed ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        // Começa a baixar o artigo com o mouse em cima, como os links do app
        onPointerEnter={() => (timer.current = window.setTimeout(() => prefetchArticle(item.page), 120))}
        onPointerLeave={() => clearTimeout(timer.current)}
        title={item.en}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 pl-1.5 text-left"
      >
        <Sprite src={item.sprite} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate text-[13px] font-medium ${dimmed ? 'line-through decoration-muted' : ''}`}>
            {hasPt ? item.pt : item.en}
          </span>
          {hasPt && <span className="block truncate text-[11px] text-muted">{item.en}</span>}
        </span>
      </button>
      {actions && (
        <span className={`flex shrink-0 ${alwaysShowActions ? '' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'}`}>
          {actions}
        </span>
      )}
    </li>
  )
}

function Sprite({ src }: { src?: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/25">
      {src ? (
        <img
          src={src}
          alt=""
          className="pixelated max-h-6 max-w-6 object-contain"
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
      )}
    </span>
  )
}

interface IconButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}

function IconButton({ label, onClick, disabled, active, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent ${
        active ? 'text-gold' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** Etapa do mundo ativo e os próximos chefes/eventos (na ordem de sempre). */
function WorldTab({ open }: { open: (path: string) => void }) {
  const { user } = useAuth()
  const state = useWorld()
  const current = activeWorld(state)
  const stage = useWorldStage()

  if (!user || !current) {
    return (
      <div className="px-3 py-6 text-center text-xs leading-relaxed text-muted">
        <p>{user ? 'Nenhum mundo ativo.' : 'O mundo compartilhado precisa de login.'}</p>
        <button type="button" onClick={() => open(user ? '/mundo' : '/conta')} className="mt-2 font-semibold text-accent hover:underline">
          {user ? 'Criar ou entrar num mundo' : 'Entrar na conta'}
        </button>
      </div>
    )
  }

  const done = new Set(state.progress.map((p) => p.key))
  // Devorador e Cérebro são o mesmo passo: derrotar um basta
  const evilDone = done.has('Eater of Worlds') || done.has('Brain of Cthulhu')
  const next = MILESTONES.filter((m) => !done.has(m.key) && !(evilDone && (m.key === 'Eater of Worlds' || m.key === 'Brain of Cthulhu'))).slice(0, 5)

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => open('/mundo')} className="glass block w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10">
        <span className="block truncate text-[13px] font-semibold">{current.name}</span>
        <span className="block text-[11px] text-muted">{MODE_LABELS[current.mode]}</span>
        {stage && <span className="mt-1 block text-sm font-semibold text-gold">{stage.label}</span>}
      </button>
      {next.length > 0 && (
        <>
          <p className="px-1.5 text-[10px] font-semibold tracking-wide text-muted uppercase">Próximos</p>
          <ul className="space-y-0.5">
            {next.map((m) => (
              <Row
                key={m.key}
                item={{ page: m.key, en: m.key, pt: m.optional ? `${m.pt} · opcional` : m.pt, sprite: m.icon }}
                onOpen={() => open(articlePath(m.key))}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
