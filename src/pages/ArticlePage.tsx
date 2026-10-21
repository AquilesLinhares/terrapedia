import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cleanArticle } from '../lib/cleanArticle'
import { fetchArticle, fetchSearch, PageNotFoundError, wikiPageUrl } from '../lib/wikiApi'
import { displayName, searchDictionary } from '../lib/ptSearch'
import { articlePath } from '../components/SearchBar'
import ArticleActions from '../components/ArticleActions'
import { fetchArticleRef } from '../lib/articleRef'
import { library, type ArticleRef } from '../lib/library'
import { useRecipeBook } from '../lib/recipes'
import CraftingSection, { craftingFor } from '../components/CraftingSection'
import GuideView from '../components/GuideView'
import { hasGuide, loadGuide, searchGuides, type Guide } from '../lib/guides'
import { useArticleTranslation, type TranslationState } from '../lib/useArticleTranslation'
import { useArticleLang, type ArticleLang } from '../lib/articleLang'
import { loadGameNames } from '../lib/localize'

type State =
  | { status: 'loading' }
  | { status: 'ok'; title: string; html: string }
  | { status: 'notfound'; results: { page: string; label: string; snippet?: string; hint?: string }[] }
  | { status: 'error'; message: string }

export default function ArticlePage() {
  const { '*': rawTitle = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const title = useMemo(() => rawTitle.replace(/_/g, ' '), [rawTitle])
  const [state, setState] = useState<State>({ status: 'loading' })
  // Nome PT e sprite do artigo, usados ao salvar em favoritos/grupos/"buscar depois"
  const [articleRef, setArticleRef] = useState<ArticleRef | null>(null)
  // Receitas: desenhadas no lugar da seção "Crafting" da wiki (o "slot" marcado pelo cleanArticle)
  const book = useRecipeBook()
  const contentRef = useRef<HTMLDivElement>(null)
  const [craftingSlot, setCraftingSlot] = useState<HTMLElement | null>(null)
  const crafting = useMemo(
    () => (book && state.status === 'ok' ? craftingFor(book, state.title) : null),
    [book, state],
  )

  // Página reorganizada (resumo em português), quando existe. Aparece no lugar do artigo, a menos
  // que a pessoa peça a página completa (?completa) ou o endereço aponte uma seção da wiki (#...).
  // Ela vem junto com o app: aparece logo, mesmo antes (ou sem) o artigo carregar.
  const guidePage = hasGuide(title) ? title : state.status === 'ok' && hasGuide(state.title) ? state.title : null
  const [guide, setGuide] = useState<Guide | null>(null)
  const wantsFull = searchParams.has('completa') || (!!hash && !hash.startsWith('#resumo-'))
  const showGuide = !!guidePage && !wantsFull

  // Português (nomes, rótulos e tradução automática) ou o original em inglês
  const [lang, setLang] = useArticleLang()
  const translation = useArticleTranslation(
    state.status === 'ok' ? state.title : null,
    state.status === 'ok' ? state.html : null,
    lang === 'pt' && !showGuide,
  )
  const articleHtml = state.status === 'ok' ? (lang === 'pt' ? translation.html : state.html) : null

  useLayoutEffect(() => {
    setCraftingSlot(contentRef.current?.querySelector<HTMLElement>('[data-crafting-slot]') ?? null)
  }, [articleHtml, showGuide])

  // Com receitas do app, a versão original da wiki fica escondida (volta se não tivermos dados)
  useLayoutEffect(() => {
    craftingSlot?.classList.toggle('has-app', !!crafting)
  }, [craftingSlot, crafting])

  useEffect(() => {
    setGuide(null)
    if (!guidePage) return
    let alive = true
    loadGuide(guidePage)?.then((g) => alive && setGuide(g))
    return () => {
      alive = false
    }
  }, [guidePage])

  // Trocar entre o resumo e a página completa volta pro topo
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [showGuide])

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
          // Primeiro as páginas reorganizadas cujas etiquetas batem com a descrição ("peneira de limo"),
          // depois o dicionário PT ↔ EN (ex.: "Lua de Sangue") e por fim a busca no texto da wiki
          const [byTags, dict, search, names] = await Promise.all([
            searchGuides(title, 3),
            searchDictionary(title, 5),
            fetchSearch(title, controller.signal).catch(() => []),
            loadGameNames(),
          ])
          if (controller.signal.aborted) return
          const fromTags = byTags.map((g) => ({
            page: g.page,
            label: displayName({ pt: g.pt ?? g.page, en: g.page }),
            hint: `Pela descrição: ${g.matched.slice(0, 4).join(', ')}`,
          }))
          const seen = new Set(fromTags.map((r) => r.page))
          const fromDict = dict.filter((m) => !seen.has(m.page)).map((m) => ({ page: m.page, label: displayName(m) }))
          for (const r of fromDict) seen.add(r.page)
          const fromWiki = search
            .filter((r) => !seen.has(r.title))
            .map((r) => ({ page: r.title, label: displayName({ pt: names.lower.get(r.title.toLowerCase()) ?? r.title, en: r.title }), snippet: r.snippet }))
          setState({ status: 'notfound', results: [...fromTags, ...fromDict, ...fromWiki] })
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

  if (showGuide) {
    const pageTitle = state.status === 'ok' ? state.title : guidePage
    return (
      <article className="mx-auto max-w-5xl px-4 py-6">
        <ArticleHeader title={pageTitle} articleRef={articleRef} lang="pt" />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-gold">Resumo organizado</span> em português, feito a partir da wiki.
            Pode faltar algum detalhe.
          </p>
          <button
            type="button"
            onClick={() => setSearchParams({ completa: '1' })}
            className="h-9 shrink-0 rounded-full border border-line bg-panel px-4 text-sm font-semibold text-accent transition hover:border-accent"
          >
            Ver página completa da wiki
          </button>
        </div>

        {guide && book ? <GuideView guide={guide} book={book} /> : <LoadingLines />}

        <p className="mt-10 rounded-lg border border-line bg-panel/60 px-4 py-3 text-sm text-muted">
          Resumo em português feito pela Terrapedia a partir do artigo “
          <a
            href={guide ? `${wikiPageUrl(pageTitle)}?oldid=${guide.source.revid}` : wikiPageUrl(pageTitle)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {pageTitle}
          </a>
          ” da Terraria Wiki{guide && ` (versão de ${guide.source.date.split('-').reverse().join('/')})`}, licenciado sob{' '}
          <LicenseLink />. Este resumo é uma adaptação e segue a mesma licença.
        </p>
      </article>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 h-9 w-2/3 animate-pulse rounded bg-panel" />
        <LoadingLines />
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
                {r.hint && <span className="mt-0.5 block text-xs text-muted">{r.hint}</span>}
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
      <ArticleHeader title={state.title} articleRef={articleRef} lang={lang} onLang={setLang} />
      {lang === 'pt' && <TranslationNotice state={translation.state} onDownload={translation.startDownload} />}

      {guidePage && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel/70 px-4 py-2.5">
          <p className="text-sm text-muted">Você está vendo a página completa da wiki.</p>
          <button
            type="button"
            onClick={() => navigate({ search: '', hash: '' })}
            className="h-8 shrink-0 rounded-full border border-gold/50 bg-gold/10 px-3.5 text-sm font-semibold text-gold transition hover:bg-gold/20"
          >
            Ver resumo organizado
          </button>
        </div>
      )}

      {articleHtml === null ? (
        <LoadingLines />
      ) : (
        <div
          ref={contentRef}
          lang={lang === 'pt' ? 'pt-BR' : 'en'}
          className="wiki-content"
          onClick={onContentClick}
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />
      )}

      {book && crafting && craftingSlot && createPortal(<CraftingSection book={book} crafting={crafting} />, craftingSlot)}
      {book && crafting && !craftingSlot && (
        <section className="wiki-content">
          <h2>Crafting</h2>
          <CraftingSection book={book} crafting={crafting} />
        </section>
      )}

      <p className="mt-10 rounded-lg border border-line bg-panel/60 px-4 py-3 text-sm text-muted">
        Fonte: artigo “
        <a href={wikiPageUrl(state.title)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {state.title}
        </a>
        ” da Terraria Wiki, licenciado sob <LicenseLink />. O conteúdo foi adaptado (menus e navegação removidos)
        {lang === 'pt' && ' e traduzido: nomes pelo dicionário oficial do jogo e o texto por tradução automática'}.
      </p>
    </article>
  )
}

interface HeaderProps {
  title: string
  articleRef: ArticleRef | null
  lang: ArticleLang
  /** Mostra o botão PT / EN */
  onLang?: (lang: ArticleLang) => void
}

/** Título (PT em destaque e EN embaixo, ou o contrário), link para a wiki original e botões de salvar. */
function ArticleHeader({ title, articleRef, lang, onLang }: HeaderProps) {
  const pt = articleRef?.pt
  const [main, sub] = lang === 'pt' && pt ? [pt, title] : [title, pt]
  return (
    <header className="mb-4 border-b border-line pb-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-gold sm:text-4xl">{main}</h1>
          {sub && <p className="mt-0.5 text-muted">{sub}</p>}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={wikiPageUrl(title)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition hover:text-accent"
          >
            Ver na wiki original ↗
          </a>
          {onLang && (
            <div className="flex rounded-full border border-line bg-panel p-0.5 text-xs font-bold" role="group" aria-label="Idioma do artigo">
              {(['pt', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => onLang(l)}
                  title={l === 'pt' ? 'Ver em português' : 'Ver o original em inglês'}
                  className={`h-7 rounded-full px-3 transition ${lang === l ? 'bg-gold text-bg' : 'text-muted hover:text-ink'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {articleRef && (
        <div className="mt-3">
          <ArticleActions article={articleRef} />
        </div>
      )}
    </header>
  )
}

/** Aviso discreto sobre a tradução do texto corrido (andamento, download ou indisponível). */
function TranslationNotice({ state, onDownload }: { state: TranslationState; onDownload: () => void }) {
  const box = 'mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-panel/60 px-3 py-2 text-xs text-muted'
  if (state.kind === 'translating') {
    const pct = Math.round((state.done / state.total) * 100)
    return (
      <div className={box} role="status">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-accent" />
        Traduzindo o texto no seu aparelho… {pct}%
      </div>
    )
  }
  if (state.kind === 'download') {
    return (
      <div className={box}>
        <span className="flex-1">
          {state.progress !== undefined
            ? `Baixando o tradutor do Chrome… ${Math.round(state.progress * 100)}%`
            : 'O texto está em inglês. O Chrome pode traduzir esta página no seu aparelho, de graça.'}
        </span>
        {state.progress === undefined && (
          <button type="button" onClick={onDownload} className="font-semibold text-accent hover:underline">
            Baixar tradutor
          </button>
        )}
      </div>
    )
  }
  if (state.kind === 'unavailable') {
    const all = state.missing === state.total
    return (
      <p className={box}>
        {all ? 'Texto em inglês' : 'Parte do texto está em inglês'}: a tradução automática não está disponível neste
        navegador (funciona no Chrome para computador). Os nomes do jogo já estão em português.
      </p>
    )
  }
  if (state.kind === 'done' && state.failed > 0) {
    return <p className={box}>Alguns trechos não puderam ser traduzidos e ficaram em inglês.</p>
  }
  return null
}

function LicenseLink() {
  return (
    <a
      href="https://creativecommons.org/licenses/by-nc-sa/3.0/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
    >
      CC BY-NC-SA 3.0
    </a>
  )
}

function LoadingLines() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-4 rounded bg-panel" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
      ))}
    </div>
  )
}
