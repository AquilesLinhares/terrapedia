import { Link } from 'react-router-dom'
import { npcIcon } from '../lib/npcs'
import { ptName, type RecipeBook } from '../lib/recipes'
import { articlePath } from './SearchBar'

/** NPC clicável: cabeça do mapa + nome PT (+ EN). */
export default function NpcName({ book, name, showEn = true, size = 'md' }: { book: RecipeBook; name: string; showEn?: boolean; size?: 'md' | 'lg' }) {
  const pt = ptName(book, name)
  return (
    <Link to={articlePath(name)} className="group inline-flex min-w-0 items-center gap-2">
      <img src={npcIcon(name)} alt="" loading="lazy" className={`pixelated shrink-0 object-contain ${size === 'lg' ? 'h-9 w-9' : 'h-6 w-6'}`} />
      <span className="min-w-0 leading-tight">
        <span className={`font-medium text-accent group-hover:underline ${size === 'lg' ? 'font-display text-xl font-bold' : ''}`}>{pt}</span>
        {showEn && pt !== name && <span className="block truncate text-xs text-muted">{name}</span>}
      </span>
    </Link>
  )
}
