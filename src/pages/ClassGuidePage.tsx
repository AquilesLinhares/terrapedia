import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ClassContext, ItemSprite, type ClassCtx } from '../components/ClassItems'
import ClassPathMap from '../components/ClassPathMap'
import ClassSummary from '../components/ClassSummary'
import { RichText } from '../components/GuideView'
import { ChevronLeftIcon, GlobeIcon } from '../components/icons'
import { CLASS_LIST, loadClassGuide, loadExclusive, type ClassGuide, type ExclusiveMode } from '../lib/classGuides'
import { STAGES, stageAtLeast } from '../lib/progression'
import { normalize } from '../lib/ptSearch'
import { useRecipeBook } from '../lib/recipes'
import { WIKI_BASE } from '../lib/wikiApi'
import { activeWorld, CLASS_LABELS, MODE_LABELS, useWorld, useWorldStage } from '../lib/world'

/**
 * Guia de uma classe (`/classes/invocador`). Duas abas: Resumo (o melhor de cada etapa) e Detalhado
 * (mapa de caminhos). Abre na etapa do mundo ativo. Na URL: `?aba=detalhado`, `?etapa=hardmode`, `?sub=chicotes`.
 */
export default function ClassGuidePage() {
  const { slug } = useParams()
  const entry = CLASS_LIST.find((c) => c.slug === slug)
  const [params, setParams] = useSearchParams()
  const book = useRecipeBook()
  const [guide, setGuide] = useState<ClassGuide | null | 'missing'>(null)
  const [exclusive, setExclusive] = useState<Record<string, ExclusiveMode>>({})
  const state = useWorld()
  const world = activeWorld(state)
  const worldStage = useWorldStage()

  useEffect(() => {
    setGuide(null)
    const load = entry && loadClassGuide(entry.class)
    if (!load) return setGuide('missing')
    let alive = true
    load.then((g) => alive && setGuide(g))
    return () => {
      alive = false
    }
  }, [entry])

  useEffect(() => {
    loadExclusive().then(setExclusive)
  }, [])

  useEffect(() => {
    document.title = `${entry ? CLASS_LABELS[entry.class] : 'Classe'} · Guias de classe · Terrapedia`
  }, [entry])

  const names = guide && guide !== 'missing' ? guide.names : undefined
  const ctx = useMemo<ClassCtx | null>(
    () => (book ? { book, exclusive, worldMode: world?.mode ?? null, names: names ?? {} } : null),
    [book, exclusive, world?.mode, names],
  )

  if (!entry) return <Missing text="Essa classe não existe." />
  if (guide === 'missing') return <Missing text={`O guia de ${CLASS_LABELS[entry.class]} ainda não foi escrito.`} />
  if (!guide || !ctx) return <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">Carregando…</p>

  // Etapa do mundo dentro do guia (o guia pode não ter todas as etapas: fica a última já alcançada)
  const guideWorldStage = worldStage ? [...guide.stages].reverse().find((s) => stageAtLeast(worldStage.id, s.stage))?.stage ?? null : null
  const stage = guide.stages.find((s) => s.stage === params.get('etapa')) ?? guide.stages.find((s) => s.stage === guideWorldStage) ?? guide.stages[0]
  const tab = params.get('aba') === 'detalhado' ? 'detalhado' : 'resumo'

  // Filtro de subclasse: o da URL; sem nada na URL, a subclasse que você escreveu na sua ficha do mundo
  const me = state.members.find((m) => m.userId === state.userId)
  const mySub = me?.playerClass === entry.class && me.subclass ? guide.subclasses.find((s) => normalize(s.label) === normalize(me.subclass!))?.id : undefined
  const subParam = params.get('sub')
  const sub = subParam === 'todas' ? null : (guide.subclasses.find((s) => s.id === subParam)?.id ?? (subParam ? null : (mySub ?? null)))

  function set(key: string, value: string | null) {
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value === null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  return (
    <ClassContext.Provider value={ctx}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link to="/classes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeftIcon className="h-4 w-4" /> Guias de classe
        </Link>

        <header className="mb-4 flex items-start gap-3">
          <ItemSprite item={guide.emblem} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold text-gold">{guide.title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink/85">
              <RichText text={guide.intro} book={ctx.book} />
            </p>
          </div>
        </header>

        <details className="mb-4 rounded-xl border border-line bg-panel/60 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-semibold text-accent">Como a classe funciona</summary>
          <ul className="mt-2 mb-1 list-disc space-y-1 pl-5 leading-relaxed text-ink/90 marker:text-gold/70">
            {guide.basics.map((t, i) => (
              <li key={i}>
                <RichText text={t} book={ctx.book} />
              </li>
            ))}
          </ul>
        </details>

        <WorldLine stageLabel={worldStage?.label} />

        {/* Filtro de subclasse */}
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Subclasse">
          <FilterChip active={sub === null} onClick={() => set('sub', 'todas')}>
            Todas
          </FilterChip>
          {guide.subclasses.map((s) => (
            <FilterChip key={s.id} active={sub === s.id} onClick={() => set('sub', s.id)} title={s.text.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]|\*\*/g, '$1')}>
              <ItemSprite item={s.icon} size="sm" />
              {s.label}
            </FilterChip>
          ))}
        </div>

        {/* Abas */}
        <div className="mb-4 flex border-b border-line" role="tablist">
          {(['resumo', 'detalhado'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => set('aba', t === 'resumo' ? null : t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                tab === t ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t === 'resumo' ? 'Resumo' : 'Detalhado'}
            </button>
          ))}
        </div>

        {tab === 'resumo' ? (
          <>
            <StageStepper guide={guide} current={stage.stage} worldStage={guideWorldStage} onPick={(id) => set('etapa', id)} />
            <ClassSummary guide={guide} stage={stage} sub={sub} onStage={(id) => set('etapa', id)} />
          </>
        ) : (
          <ClassPathMap guide={guide} sub={sub} worldStage={guideWorldStage} />
        )}

        <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
          Organizado em português a partir de{' '}
          <a
            href={`${WIKI_BASE}/index.php?oldid=${guide.source.revid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {guide.source.page}
          </a>{' '}
          e das páginas dos itens na Terraria Wiki (revisão de {new Date(guide.source.date + 'T12:00').toLocaleDateString('pt-BR')}), sob licença
          CC BY-NC-SA 3.0. Selos de Expert/Mestre pela raridade dos itens na wiki.
        </p>
      </div>
    </ClassContext.Provider>
  )
}

function WorldLine({ stageLabel }: { stageLabel: string | null | undefined }) {
  const world = activeWorld(useWorld())
  if (!world)
    return (
      <p className="mb-4 flex items-start gap-2 text-sm text-muted">
        <GlobeIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Sem mundo ativo. Com um mundo em <Link to="/mundo" className="font-semibold text-accent hover:underline">Meu mundo</Link>, o guia
          abre na etapa em que vocês estão e avisa quais itens de Expert/Mestre existem no seu mundo.
        </span>
      </p>
    )
  return (
    <p className="mb-4 flex items-start gap-2 text-sm text-muted">
      <GlobeIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <span>
        <strong className="text-ink">{world.name}</strong> ({MODE_LABELS[world.mode]}){stageLabel && (
          <>
            {' '}
            está em <strong className="text-gold">{stageLabel}</strong>
          </>
        )}
        .
      </span>
    </p>
  )
}

function FilterChip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition ${
        active ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-line text-muted hover:border-accent hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** Etapas lado a lado (rolam para o lado no celular); a do mundo ativo tem um ponto dourado. */
function StageStepper({
  guide,
  current,
  worldStage,
  onPick,
}: {
  guide: ClassGuide
  current: string
  worldStage: string | null
  onPick: (id: string) => void
}) {
  const list = useRef<HTMLOListElement>(null)
  // Centraliza a etapa escolhida só rolando a lista para o lado (scrollIntoView rolaria a página também)
  useEffect(() => {
    const ol = list.current
    const li = ol?.querySelector<HTMLElement>('[aria-current="step"]')?.parentElement
    if (ol && li) ol.scrollTo({ left: li.offsetLeft - (ol.clientWidth - li.clientWidth) / 2, behavior: 'smooth' })
  }, [current])

  return (
    <ol ref={list} className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-2" aria-label="Etapas">
      {guide.stages.map((st, i) => {
        const stage = STAGES.find((s) => s.id === st.stage)
        const active = st.stage === current
        return (
          <li key={st.stage} className="shrink-0">
            <button
              type="button"
              aria-current={active ? 'step' : undefined}
              onClick={() => onPick(st.stage)}
              className={`relative flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-sm whitespace-nowrap transition ${
                active
                  ? 'border-gold bg-gold/15 font-semibold text-gold'
                  : stage?.phase === 'hard'
                    ? 'border-accent/30 text-ink/80 hover:border-accent'
                    : 'border-line text-ink/80 hover:border-accent'
              }`}
            >
              <span className="text-xs text-muted">{i + 1}</span>
              {stage?.label ?? st.stage}
              {st.stage === worldStage && (
                <span title="Etapa do seu mundo" className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-bg bg-gold" />
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Missing({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-sm text-muted">{text}</p>
      <Link to="/classes" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
        Ver os guias de classe
      </Link>
    </div>
  )
}
