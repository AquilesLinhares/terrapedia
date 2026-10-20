import { Link } from 'react-router-dom'
import type { ArticleRef } from '../lib/library'
import { articlePath } from './SearchBar'

interface Props {
  article: ArticleRef
  /** Algo antes do sprite (ex.: checkbox "já vi") */
  leading?: React.ReactNode
  /** Botões à direita (ex.: remover) */
  trailing?: React.ReactNode
  dimmed?: boolean
}

/** Uma linha de lista com sprite, nome em português e nome em inglês. */
export default function SavedArticleRow({ article, leading, trailing, dimmed }: Props) {
  const hasPt = !!article.pt && article.pt !== article.en

  return (
    <li className={`flex items-center gap-2 rounded-xl border border-line bg-panel pr-1 pl-2 transition ${dimmed ? 'opacity-55' : ''}`}>
      {leading}
      <Link to={articlePath(article.page)} className="flex min-w-0 flex-1 items-center gap-3 py-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg/60">
          {article.sprite ? (
            <img
              src={article.sprite}
              alt=""
              className="pixelated max-h-9 max-w-9 object-contain"
              loading="lazy"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
          ) : (
            <span className="h-2 w-2 rounded-full bg-line" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${dimmed ? 'text-ink line-through decoration-muted' : 'text-ink'}`}>
            {hasPt ? article.pt : article.en}
          </span>
          {hasPt && <span className="block truncate text-sm text-muted">{article.en}</span>}
        </span>
      </Link>
      {trailing}
    </li>
  )
}

/** Botão pequeno de ícone usado nas listas (remover, etc.). */
export function RowButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-bg/50 hover:text-ink"
    >
      {children}
    </button>
  )
}
