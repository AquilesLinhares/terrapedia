import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cleanArticle } from '../lib/cleanArticle'
import { fetchArticle, fetchSearch, PageNotFoundError, wikiPageUrl } from '../lib/wikiApi'
import { displayName, searchDictionary } from '../lib/ptSearch'
import { articlePath } from '../components/SearchBar'
import ArticleActions from '../components/ArticleActions'
import { fetchArticleRef } from '../lib/articleRef'
import { library, type ArticleRef } from '../lib/library'

type State =
  | { status: 'loading' }
  | { status: 'ok'; title: string; html: string }
  | { status: 'notfound'; results: { page: string; label: string; snippet?: string }[] }
  | { status: 'error'; message: string }

export default function ArticlePage() {
  const { '*': rawTitle = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const title = useMemo(() => rawTitle.replace(/_/g, ' '), [rawTitle])
  const [state, setState] = useState<State>({ status: 'loading' })
  // Nome PT e sprite do artigo, usados ao salvar em favoritos/grupos/"buscar depois"
  const [articleRef, setArticleRef] = useState<ArticleRef | null>(null)

  // Carrega o artigo sempre que o título da URL muda.
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    setArticleRef(null)
    window.scrollTo(0, 0)
    document.title = 'Terrapedia'

    fetchArticle(title, controller.signal)
      .then((article) => {
        const html = cleanArticle(article.html)
        setState({ status: 'ok', title: article.title, html })
        document.title = `${article.title} · Terrapedia`
        setArticleRef({ page: article.title, en: article.title })
        fetchArticleRef(article.title, html, controller.signal).then((ref) => {
          if (controller.signal.aborted) return
          setArticleRef(ref)
          library.refreshArticle(ref) // atualiza itens já salvos (ex.: sprite que faltava)
        })
      })
      .catch(async (err) => {
        if (controller.signal.aborted) return
        if (err instanceof PageNotFoundError) {
          // Primeiro o dicionário PT ↔ EN (ex.: "Lua de Sangue"), depois a busca no texto da wiki
          const [dict, search] = await Promise.all([
            searchDictionary(title, 5),
            fetchSearch(title, controller.signal).catch(() => []),
          ])
          if (controller.signal.aborted) return
          const fromDict = dict.map((m) => ({ page: m.page, label: displayName(m) }))
          const seen = new Set(fromDict.map((r) => r.page))
          const fromWiki = search.filter((r) => !seen.has(r.title)).map((r) => ({ page: r.title, label: r.title, snippet: r.snippet }))
          setState({ status: 'notfound', results: [...fromDict, ...fromWiki] })
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
            <li key={r.page}>
              <Link
                to={articlePath(r.page)}
                className="block rounded-lg border border-line bg-panel px-4 py-3 transition hover:border-accent"
              >
                <span className="font-semibold text-accent">{r.label}</span>
                {r.snippet && (
                  <span className="search-snippet mt-1 block text-sm text-muted" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 border-b border-line pb-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold text-gold sm:text-4xl">{state.title}</h1>
            {articleRef?.pt && <p className="mt-0.5 text-muted">{articleRef.pt}</p>}
          </div>
          <a
            href={wikiPageUrl(state.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition hover:text-accent"
          >
            Ver na wiki original ↗
          </a>
        </div>
        {articleRef && (
          <div className="mt-3">
            <ArticleActions article={articleRef} />
          </div>
        )}
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
