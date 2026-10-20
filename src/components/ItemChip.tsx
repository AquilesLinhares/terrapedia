import { Link } from 'react-router-dom'
import { isGroup, pageFor, ptName, spriteUrl, type RecipeBook } from '../lib/recipes'
import { articlePath } from './SearchBar'

/** Sprite de item (pixel art); some se a imagem não existir na wiki. */
export function Sprite({ book, name, size = 'md' }: { book: RecipeBook; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const url = spriteUrl(book, name)
  const box = size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  const img = size === 'sm' ? 'max-h-6 max-w-6' : size === 'lg' ? 'max-h-11 max-w-11' : 'max-h-8 max-w-8'
  return (
    <span className={`flex shrink-0 items-center justify-center ${box}`}>
      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          className={`pixelated object-contain ${img}`}
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
      )}
    </span>
  )
}

interface Props {
  book: RecipeBook
  name: string
  amount?: number
  size?: 'sm' | 'md' | 'lg'
  /** Mostra o nome em inglês embaixo */
  showEn?: boolean
  /** Destaca (ex.: o item do artigo dentro de "Usado em") */
  highlight?: boolean
}

/** Item clicável: sprite + nome PT (+ nome EN) + quantidade. */
export default function ItemChip({ book, name, amount, size = 'md', showEn = true, highlight }: Props) {
  const pt = ptName(book, name)
  const members = isGroup(name) ? book.groups.get(name) : undefined
  const title = members ? members.map((m) => ptName(book, m)).join(', ') : pt !== name ? name : undefined
  return (
    <Link
      to={articlePath(pageFor(name))}
      title={title}
      className={`group inline-flex min-w-0 items-center gap-2 rounded-md ${highlight ? 'bg-gold/10 pr-1.5 ring-1 ring-gold/40' : ''}`}
    >
      <Sprite book={book} name={name} size={size} />
      <span className="min-w-0 leading-tight">
        <span className={`font-medium group-hover:underline ${highlight ? 'text-gold' : 'text-accent'}`}>{pt}</span>
        {amount !== undefined && amount > 1 && (
          <span className="ml-1.5 rounded bg-bg/70 px-1.5 text-xs font-semibold text-gold">×{amount}</span>
        )}
        {showEn && pt !== name && <span className="block truncate text-xs text-muted">{name}</span>}
      </span>
    </Link>
  )
}
