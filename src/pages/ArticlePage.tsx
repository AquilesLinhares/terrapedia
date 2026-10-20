import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cleanArticle } from '../lib/cleanArticle'
import { fetchArticle, fetchSearch, PageNotFoundError, wikiPageUrl, type SearchResult } from '../lib/wikiApi'
import { articlePath } from '../components/SearchBar'

type State =
  | { status: 'loading' }
  | { status: 'ok'; title: string; html: string }
  | { status: 'notfound'; results: SearchResult[] }
  | { status: 'error'; message: string }

export default function ArticlePage() {
  const { '*': rawTitle = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const title = useMemo(() => rawTitle.replace(/_/g, ' '), [rawTitle])
  const [state, setState] = useState<State>({ status: 'loading' })

  // Carrega o artigo sempre que o título da URL muda.
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    window.scrollTo(0, 0)
    document.title = 'Terrapedia'

    fetchArticle(title, controller.signal)
      .then((article) => {
        setState({ status: 'ok', title: article.title, html: cleanArticle(article.html) })
        document.title = `${article.title} · Terrapedia`
      })
      .catch(async (err) => {
        if (controller.signal.aborted) return
        if (err instanceof PageNotFoundError) {
          const results = await fetchSearch(title, controller.signal).catch(() => [])
          setState({ status: 'notfound', results })
        } else {
          setState({ status: 'error', message: 'Não foi possível carregar a página. Verifique sua internet.' })
        }
      })

    return () => controller.abort()
  }, [title])

  // Se a URL tem "#Secao", rola até ela depois que o conteúdo aparece.
  useEffect(() => {
    if (state.status !== 'ok' || !hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state, hash])

  // Links internos da wiki: em vez de recarregar a página, navega dentro do app.
  function onContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest('a')
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
    const href = link.getAttribute('href') ?? ''
    if (href.startsWith('#')) {
      e.preventDefault()
      navigate({ hash: href }, { replace: true })
      document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ behavior: 'smooth' })
    } else if (link.dataset.internal) {
      e.preventDefault()
      navigate(href)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-8">
        <div className="mb-6 h-9 w-2/3 rounded bg-panel" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-panel" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return <p className="mx-auto max-w-4xl px-4 py-12 text-center text-muted">{state.message}</p>
  }

  if (state.status === 'notfound') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 font-display text-2xl font-bold text-gold">Página não encontrada</h1>
        <p className="mb-6 text-muted">
          Não existe uma página chamada “{title}”. {state.results.length > 0 && 'Talvez você procure:'}
        </p>
        <ul className="space-y-2">
          {state.results.map((r) => (
            <li key={r.title}>
              <Link
                to={articlePath(r.title)}
                className="block rounded-lg border border-line bg-panel px-4 py-3 transition hover:border-accent"
              >
                <span className="font-semibold text-accent">{r.title}</span>
                <span className="search-snippet mt-1 block text-sm text-muted" dangerouslySetInnerHTML={{ __html: r.snippet }} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
        <h1 className="font-display text-3xl font-bold text-gold sm:text-4xl">{state.title}</h1>
        <a
          href={wikiPageUrl(state.title)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted transition hover:text-accent"
        >
          Ver na wiki original ↗
        </a>
      </header>

      <div className="wiki-content" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: state.html }} />

      <p className="mt-10 rounded-lg border border-line bg-panel/60 px-4 py-3 text-sm text-muted">
        Fonte: artigo “
        <a href={wikiPageUrl(state.title)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {state.title}
        </a>
        ” da Terraria Wiki, licenciado sob{' '}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/3.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          CC BY-NC-SA 3.0
        </a>
        . O conteúdo foi adaptado (menus e navegação removidos).
      </p>
    </article>
  )
}
