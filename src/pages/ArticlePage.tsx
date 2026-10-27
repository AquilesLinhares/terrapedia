import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cleanArticle } from '../lib/cleanArticle'
import { fetchSearch, PageNotFoundError, WikiUnavailableError, wikiPageUrl } from '../lib/wikiApi'
import { loadPage } from '../lib/pageCache'
import { getArticle } from '../lib/articleLoader'
import { recent } from '../lib/recent'
import { displayName, searchDictionary } from '../lib/ptSearch'
import { articlePath } from '../components/SearchBar'
import ArticleActions from '../components/ArticleActions'
import NoteBox from '../components/NoteBox'
import { fetchArticleRef } from '../lib/articleRef'
import { library, type ArticleRef } from '../lib/library'
import { useRecipeBook } from '../lib/recipes'
import CraftingSection, { craftingFor } from '../components/CraftingSection'
import GuideView from '../components/GuideView'
import { hasGuide, loadGuide, searchGuides, type Guide } from '../lib/guides'
import { useLocalizedArticle } from '../lib/useLocalizedArticle'
import { useArticleLang, type ArticleLang } from '../lib/articleLang'
import { loadGameNames } from '../lib/localize'
import { useLocalInfo } from '../lib/localInfo'
import QuickSummary from '../components/QuickSummary'

type State =
  | { status: 'loading' }
  /** `savedAt`: a wiki não respondeu e esta é a cópia salva no aparelho */
  | { status: 'ok'; title: string; html: string; savedAt?: number }
  | { status: 'notfound'; results: { page: string; label: string; snippet?: string; hint?: string }[] }
  | { status: 'error'; message: string }

const ERROR_MESSAGES = {
  offline: 'Sem internet. Conecte-se e tente de novo.',
  maintenance: 'A Terraria Wiki está em manutenção ou fora do ar agora. Tente de novo daqui a pouco.',
  other: 'Não foi possível carregar a página.',
}

export default function ArticlePage() {
  const { '*': rawTitle = '' } = useParams()
  const { hash } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const title = useMemo(() => rawTitle.replace(/_/g, ' '), [rawTitle])
  const local = useLocalInfo(title)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0) // "Tentar de novo"
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

  // Português (nomes e rótulos do jogo) ou o original em inglês
  const [lang, setLang] = useArticleLang()
  const localizedHtml = useLocalizedArticle(state.status === 'ok' ? state.html : null, lang === 'pt' && !showGuide)
  const articleHtml = state.status === 'ok' ? (lang === 'pt' ? localizedHtml : state.html) : null

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

  // Carrega o artigo sempre que o título da URL muda. Se já existe uma cópia no aparelho, ela aparece
  // na hora e a wiki é consultada em segundo plano; a versão nova só redesenha a página se mudou algo.
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    setArticleRef(null)
    window.scrollTo(0, 0)
    document.title = 'Terrapedia'

    let shown: string | null = null // HTML cru que está na tela
    let fresh = false // a resposta da wiki já chegou (a cópia do aparelho não vale mais)
    function show(article: { title: string; html: string }, savedAt?: number) {
      if (controller.signal.aborted) return
      if (article.html === shown) {
        if (savedAt) setState((s) => (s.status === 'ok' ? { ...s, savedAt } : s))
        return
      }
      shown = article.html
      const html = cleanArticle(article.html)
      setState({ status: 'ok', title: article.title, html, savedAt })
      document.title = `${article.title} · Terrapedia`
      setArticleRef((ref) => (ref?.page === article.title ? ref : { page: article.title, en: article.title }))
      fetchArticleRef(article.title, html, controller.signal).then((ref) => {
        if (controller.signal.aborted) return
        setArticleRef(ref)
        library.refreshArticle(ref) // atualiza itens já salvos (ex.: sprite que faltava)
        recent.add(ref)
      })
    }

    loadPage(title).then((saved) => saved && !fresh && show(saved))
    getArticle(title)
      .then((article) => {
        fresh = true
        show(article)
      })
      .catch(async (err) => {
        if (controller.signal.aborted) return
        // Wiki fora do ar ou sem internet: usa a cópia salva no aparelho, avisando a data
        if (err instanceof WikiUnavailableError) {
          const saved = await loadPage(title)
          if (saved) return show(saved, saved.savedAt)
        }
        if (shown !== null) return // a cópia do aparelho já está na tela
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
          setState({ status: 'error', message: ERROR_MESSAGES[err instanceof WikiUnavailableError ? err.reason : 'other'] })
        }
      })

    return () => controller.abort()
  }, [title, attempt])

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
        <NoteBox page={pageTitle} />

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

  // Abertura rápida: o app já conhece o item (dicionário, receitas, ferramentas, NPCs), então mostra o
  // cabeçalho e o resumo na hora e deixa o artigo da wiki chegar embaixo.
  const fast = !!local?.known && (state.status === 'loading' || state.status === 'error')

  if (state.status === 'loading' && !fast) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 h-9 w-2/3 animate-pulse rounded bg-panel" />
        <LoadingLines />
      </div>
    )
  }

  if (state.status === 'error' && !fast) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted">
        <p>{state.message}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-4 h-9 rounded-full border border-line bg-panel px-4 text-sm font-semibold text-accent transition hover:border-accent"
        >
          Tentar de novo
        </button>
      </div>
    )
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

  const pageTitle = state.status === 'ok' ? state.title : title
  const savedAt = state.status === 'ok' ? state.savedAt : undefined
  // Nome PT e sprite locais cobrem o intervalo até a wiki responder
  const headerRef: ArticleRef | null = articleRef
    ? { ...articleRef, pt: articleRef.pt ?? local?.ref.pt, sprite: articleRef.sprite ?? local?.ref.sprite }
    : (local?.ref ?? null)

  return (
    <article className="mx-auto max-w-6xl px-4 py-6">
      <ArticleHeader title={pageTitle} articleRef={headerRef} lang={lang} onLang={setLang} />
      <NoteBox page={pageTitle} />
      {savedAt && (
        <p className="mb-4 text-xs text-muted" role="status">
          A wiki não respondeu: versão salva em {new Date(savedAt).toLocaleDateString('pt-BR')}.
        </p>
      )}

      {local?.known && <QuickSummary info={local} />}

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

      {state.status === 'error' ? (
        <div className="py-6 text-center text-muted">
          <p>{state.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-4 h-9 rounded-full border border-line bg-panel px-4 text-sm font-semibold text-accent transition hover:border-accent"
          >
            Tentar de novo
          </button>
        </div>
      ) : state.status === 'loading' ? (
        <div className="min-h-[60vh]" role="status">
          <p className="mb-4 text-xs text-muted">Carregando detalhes completos da wiki...</p>
          <LoadingLines />
        </div>
      ) : articleHtml === null ? (
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
        <a href={wikiPageUrl(pageTitle)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {pageTitle}
        </a>
        ” da Terraria Wiki, licenciado sob <LicenseLink />. O conteúdo foi adaptado (menus e navegação removidos)
        {lang === 'pt' && ', com os nomes do jogo em português pelo dicionário oficial'}.
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
        <div className="flex min-w-0 items-center gap-3">
          {articleRef?.sprite && (
            <img src={articleRef.sprite} alt="" className="pixelated h-12 w-12 shrink-0 object-contain" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
          )}
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold text-gold sm:text-4xl">{main}</h1>
            {sub && <p className="mt-0.5 text-muted">{sub}</p>}
          </div>
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
