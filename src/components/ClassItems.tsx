import { createContext, useContext } from 'react'
import { Link } from 'react-router-dom'
import { itemName, type ClassItem, type ExclusiveMode } from '../lib/classGuides'
import { pageFor, ptName, spriteUrl, type RecipeBook } from '../lib/recipes'
import { WIKI_BASE } from '../lib/wikiApi'
import { MODE_LABELS, type WorldMode } from '../lib/world'
import { RichText } from './GuideView'
import { articlePath } from './SearchBar'

/** O que todo item do guia precisa saber: nomes/sprites, selos e o modo do mundo ativo. */
export interface ClassCtx {
  book: RecipeBook
  exclusive: Record<string, ExclusiveMode>
  /** Modo do mundo ativo (null sem mundo) */
  worldMode: WorldMode | null
  /** Nomes PT que faltam no dicionário (`ClassGuide.names`) */
  names: Record<string, string>
}

export const ClassContext = createContext<ClassCtx | null>(null)
export const useClassCtx = () => useContext(ClassContext)!

/** Nome PT: o do dicionário; se não houver, o que o guia traz em `names`. */
function namePt({ book, names }: ClassCtx, en: string) {
  const pt = ptName(book, en)
  return pt === en ? (names[en] ?? en) : pt
}

const parts = (item: ClassItem) => (typeof item === 'string' ? { name: item } : item)

function spriteFor(book: RecipeBook, item: ClassItem) {
  const { name, image } = parts(item)
  return image ? `${WIKI_BASE}/images/${encodeURIComponent(image.replace(/ /g, '_'))}` : spriteUrl(book, name)
}

const BOX = { sm: 'h-6 w-6', md: 'h-9 w-9', lg: 'h-14 w-14' }
const IMG = { sm: 'max-h-6 max-w-6', md: 'max-h-9 max-w-9', lg: 'max-h-14 max-w-14' }

export function ItemSprite({ item, size = 'md' }: { item: ClassItem; size?: 'sm' | 'md' | 'lg' }) {
  const { book } = useClassCtx()
  const url = spriteFor(book, item)
  return (
    <span className={`flex shrink-0 items-center justify-center ${BOX[size]}`}>
      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          className={`pixelated object-contain ${IMG[size]}`}
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
      )}
    </span>
  )
}

/**
 * Selo de item exclusivo de Expert/Mestre. Com mundo ativo, diz se o item aparece nele:
 * num mundo Clássico, um item de Expert fica riscado ("só Expert").
 */
export function ExclusiveBadge({ name }: { name: string }) {
  const { exclusive, worldMode } = useClassCtx()
  const mode = exclusive[name]
  if (!mode) return null
  const label = mode === 'expert' ? 'Expert' : 'Mestre'
  const missing = worldMode !== null && (worldMode === 'classic' || (mode === 'master' && worldMode === 'expert'))
  const title = missing
    ? `Só em mundos ${mode === 'expert' ? 'Expert ou Mestre' : 'Mestre'}: não aparece no seu mundo (${MODE_LABELS[worldMode!]})`
    : `Item exclusivo de ${mode === 'expert' ? 'Expert (e Mestre)' : 'Mestre'}${worldMode ? ': aparece no seu mundo' : ''}`
  return (
    <span
      title={title}
      className={`ml-1.5 inline-block rounded px-1.5 align-[0.1em] text-[10px] leading-4 font-bold tracking-wide uppercase ${
        missing
          ? 'bg-bg/70 text-muted line-through decoration-1'
          : mode === 'expert'
            ? 'bg-linear-to-r from-pink-500 via-amber-400 to-sky-400 text-bg'
            : 'bg-linear-to-r from-orange-500 to-red-600 text-white'
      }`}
    >
      {missing ? `só ${label}` : label}
    </span>
  )
}

/** Cartão grande do resumo: sprite grande, nome PT, nome EN, quantidade e observação. */
export function BigItem({ item, label }: { item: ClassItem; label?: string }) {
  const ctx = useClassCtx()
  const { book } = ctx
  const { name, note, qty } = parts(item)
  const pt = namePt(ctx, name)
  // O cartão todo é clicável pelo link do nome (after:inset-0); a observação fica por cima, com os próprios links
  return (
    <div className="group relative flex min-w-0 items-center gap-3 rounded-lg border border-line/70 bg-bg/40 p-2.5 transition hover:border-accent">
      <ItemSprite item={item} size="lg" />
      <span className="min-w-0 flex-1 leading-tight">
        {label && <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>}
        <Link to={articlePath(pageFor(name))} className="font-semibold text-accent group-hover:underline after:absolute after:inset-0 after:content-['']">
          {pt}
        </Link>
        {qty && <span className="ml-1.5 rounded bg-bg/70 px-1.5 text-xs font-semibold text-gold">×{qty}</span>}
        <ExclusiveBadge name={name} />
        {pt !== name && <span className="block truncate text-xs text-muted">{name}</span>}
        {note && (
          <span className="relative z-10 mt-0.5 block text-xs text-ink/75">
            <RichText text={note} book={book} />
          </span>
        )}
      </span>
    </div>
  )
}

/** Item pequeno (alternativas, caminhos do mapa): sprite + nome PT, EN no `title`. */
export function SmallItem({ item, showNote = true }: { item: ClassItem; showNote?: boolean }) {
  const ctx = useClassCtx()
  const { book } = ctx
  const { name, note, qty } = parts(item)
  const pt = namePt(ctx, name)
  return (
    <span className="inline-flex min-w-0 items-start gap-1.5 leading-tight">
      <ItemSprite item={item} size="sm" />
      <span className="min-w-0 pt-0.5">
        <Link to={articlePath(pageFor(name))} title={pt !== name ? name : undefined} className="font-medium text-accent hover:underline">
          {pt}
        </Link>
        {qty && <span className="ml-1 rounded bg-bg/70 px-1 text-[11px] font-semibold text-gold">×{qty}</span>}
        <ExclusiveBadge name={name} />
        {showNote && note && (
          <span className="block text-xs text-ink/65">
            <RichText text={note} book={book} />
          </span>
        )}
      </span>
    </span>
  )
}

export const itemKey = (item: ClassItem, i: number) => `${itemName(item)}-${i}`
