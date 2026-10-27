import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { DuoItem, DuoStage, GuideV2, ItemRef, Shortcut } from '../lib/guides'
import { STAGES } from '../lib/progression'
import type { RecipeBook } from '../lib/recipes'
import { activeWorld, CLASS_LABELS, MODE_LABELS, useWorld, useWorldStage, type PlayerClass, type WorldMode } from '../lib/world'
import CraftingSection, { craftingFor, treePath } from './CraftingSection'
import { Bullets, Group, Phases, RichText, SectionBody } from './GuideView'

// Molde novo (`format: 2`). Ordem das seções: veja "Molde novo das páginas" no CLAUDE.md.

const QUICK_LABELS = {
  boss: ['Invocar', 'Fazer', 'Cuidado'],
  item: ['Para que serve', 'Quando vale a pena'],
  crafting: ['O que faz', 'Quando montar'],
}
const MODES: WorldMode[] = ['classic', 'expert', 'master']
const DUO: { key: 'summoner' | 'mage'; cls: PlayerClass; label: string }[] = [
  { key: 'summoner', cls: 'summoner', label: CLASS_LABELS.summoner },
  { key: 'mage', cls: 'magic', label: CLASS_LABELS.magic },
]
const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id)

/** Link de cada atalho (sobre a própria página). */
function shortcutLink(kind: Shortcut, guide: GuideV2): { to: string; label: string } {
  const q = encodeURIComponent(guide.page)
  switch (kind) {
    case 'buffs':
      return { to: `/ferramentas/buffs?chefe=${q}`, label: 'Checklist de buffs' }
    case 'arena':
      return { to: `/ferramentas/arena?chefe=${q}`, label: 'Planejador de arena' }
    case 'drops':
      return { to: `/ferramentas/drops?${guide.type === 'item' ? 'item' : 'inimigo'}=${q}`, label: 'Farm de drops' }
    case 'modifier':
      return { to: `/ferramentas/modificador?item=${q}`, label: 'Melhor modificador' }
    case 'tree':
      return { to: treePath(guide.page), label: 'Árvore de crafting' }
  }
}

const linkClass =
  'inline-flex h-9 items-center rounded-full border border-gold/60 bg-gold/15 px-3.5 text-sm font-semibold text-gold transition hover:bg-gold/25 hover:no-underline!'

interface Block {
  key: string
  title: string
  body: ReactNode
  /** Seção recolhida (começa fechada) */
  collapsed?: boolean
}

/** Página no molde novo: ficha, "Em 10 segundos", caixa da dupla e seções do tipo. */
export default function GuideViewV2({ guide, book }: { guide: GuideV2; book: RecipeBook }) {
  const world = useWorld()
  const mode = activeWorld(world)?.mode
  const crafting = guide.type === 'item' ? craftingFor(book, guide.page) : null
  const shortcuts = guide.shortcuts ?? []

  const blocks: Block[] = []
  const add = (key: string, title: string, body: ReactNode, collapsed = false) => body && blocks.push({ key, title, body, collapsed })

  const quickLabels = guide.type === 'item' ? QUICK_LABELS.item : guide.type === 'crafting' ? QUICK_LABELS.crafting : QUICK_LABELS.boss
  add(
    'quick',
    'Em 10 segundos',
    <ol className="m-0! list-none! space-y-2 p-0!">
      {guide.quick.map((t, i) => (
        <li key={i} className="m-0! flex gap-3 rounded-lg border border-line bg-panel/70 px-3 py-2">
          <span className="w-24 shrink-0 text-xs font-semibold tracking-wide text-gold uppercase sm:w-32">{quickLabels[i] ?? ''}</span>
          <span className="min-w-0 text-ink">
            <RichText text={t} book={book} />
          </span>
        </li>
      ))}
    </ol>,
  )

  if (guide.type !== 'crafting') add('duo', 'Para a nossa dupla', <DuoBox guide={guide} book={book} />)

  if (guide.type === 'chefe' || guide.type === 'evento') {
    add('summon', 'Como invocar', <SectionBody section={guide.summon} book={book} />)
    add('arena', 'Arena rápida', <SectionBody section={guide.arena} book={book} />)
    add('phases', guide.type === 'evento' ? 'Ondas e inimigos' : 'Fases', <Phases phases={guide.phases} book={book} />, true)
    add('drops', 'Drops úteis', <SectionBody section={guide.drops} book={book} />)
    if (guide.dropsMore) add('dropsMore', 'Outros drops', <SectionBody section={guide.dropsMore} book={book} />, true)
    if (shortcuts.length)
      add(
        'shortcuts',
        'Atalhos',
        <div className="flex flex-wrap gap-2">
          {shortcuts.map((s) => {
            const { to, label } = shortcutLink(s, guide)
            return (
              <Link key={s} to={to} className={linkClass}>
                {label}
              </Link>
            )
          })}
        </div>,
      )
  } else if (guide.type === 'item') {
    const recipes = crafting && crafting.recipes.length > 0
    add(
      'obtain',
      'Como conseguir',
      <>
        <SectionBody section={guide.obtain} book={book} />
        {recipes && <CraftingSection book={book} crafting={crafting} only="recipes" />}
      </>,
    )
    if (guide.modifier || shortcuts.includes('modifier'))
      add(
        'modifier',
        'Melhor modificador',
        <>
          {guide.modifier && <SectionBody section={guide.modifier} book={book} />}
          <Link to={shortcutLink('modifier', guide).to} className={linkClass}>
            Abrir a ferramenta de modificadores
          </Link>
        </>,
      )
    const uses = crafting && crafting.uses.length > 0
    if (uses || guide.usedIn)
      add(
        'usedIn',
        'Usado em',
        <>
          {guide.usedIn && <SectionBody section={guide.usedIn} book={book} />}
          {uses && <CraftingSection book={book} crafting={crafting} only="uses" />}
        </>,
      )
  } else if (guide.type === 'crafting') {
    add('what', 'O que faz', <SectionBody section={guide.what} book={book} />)
    add('build', 'Como montar a estação', <SectionBody section={guide.build} book={book} />)
    add('produces', 'O que ela produz, por etapa', <SectionBody section={guide.produces} book={book} />)
    add('substitutes', 'Substitutos', <SectionBody section={guide.substitutes} book={book} />)
    if (shortcuts.includes('tree'))
      add(
        'tree',
        'Atalho',
        <Link to={shortcutLink('tree', guide).to} className={linkClass}>
          {shortcutLink('tree', guide).label}
        </Link>,
      )
  }
  if (guide.tips?.length) add('tips', 'Dicas', <Bullets texts={guide.tips} book={book} />)

  const openAndScroll = (key: string) => {
    const el = document.getElementById(`resumo-${key}`)
    if (el instanceof HTMLDetailsElement) el.open = true
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="wiki-content guide">
      <p className="mt-0 text-lg leading-relaxed text-ink">
        <RichText text={guide.summary} book={book} />
      </p>

      {guide.facts && guide.facts.length > 0 && (
        <dl className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {guide.facts.map((f) => (
            <div key={f.label} className={`rounded-lg border border-line bg-panel/70 px-3 py-2 ${f.modes ? 'col-span-2' : ''}`}>
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">{f.label}</dt>
              <dd className="m-0! mt-0.5! text-sm text-ink">
                {f.modes ? (
                  <span className="flex flex-wrap gap-1.5">
                    {f.modes.map((v, i) => (
                      <span
                        key={MODES[i]}
                        className={`rounded px-1.5 py-0.5 ${mode === MODES[i] ? 'bg-gold/20 font-semibold text-gold' : 'bg-bg/60'}`}
                      >
                        {MODE_LABELS[MODES[i]]}: <RichText text={v} book={book} />
                      </span>
                    ))}
                  </span>
                ) : (
                  <RichText text={f.value} book={book} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <nav className="-mx-4 mt-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Seções">
        {blocks.map((b) => (
          <a
            key={b.key}
            href={`#resumo-${b.key}`}
            onClick={(e) => {
              e.preventDefault()
              openAndScroll(b.key)
            }}
            className="shrink-0 rounded-full border border-line bg-panel px-3 py-1 text-sm text-ink/90 transition hover:border-accent hover:no-underline"
          >
            {b.title}
          </a>
        ))}
      </nav>

      {blocks.map((b) =>
        b.collapsed ? (
          <details key={b.key} id={`resumo-${b.key}`} className="my-4 rounded-xl border border-line bg-panel/40 px-4 py-2">
            <summary className="cursor-pointer py-1 font-display text-xl font-bold text-ink">{b.title}</summary>
            <div className="mt-2">{b.body}</div>
          </details>
        ) : (
          <section key={b.key}>
            <h2 id={`resumo-${b.key}`}>{b.title}</h2>
            {b.body}
          </section>
        ),
      )}
    </div>
  )
}

/**
 * "Para a nossa dupla": blocos Invocador e Mago. Destacada quando o mundo ativo tem membros dessas classes;
 * sem mundo continua visível, com as duas classes.
 */
function DuoBox({ guide, book }: { guide: Exclude<GuideV2, { type: 'crafting' }>; book: RecipeBook }) {
  const world = useWorld()
  const stage = useWorldStage()
  const inWorld = !!activeWorld(world)
  const names = (cls: PlayerClass) => world.members.filter((m) => m.playerClass === cls).map((m) => m.name)
  const highlighted = inWorld && DUO.some((d) => names(d.cls).length > 0)

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${highlighted ? 'border-gold/70 bg-gold/10 shadow-[0_0_0_1px_var(--color-gold)]' : 'border-line bg-panel/60'}`}>
      <p className="mt-0 mb-3 text-sm text-muted">
        {highlighted ? (
          <>
            Do seu mundo:{' '}
            {DUO.flatMap((d) => names(d.cls).map((n) => `${n} (${d.label})`)).join(' · ')}
          </>
        ) : inWorld ? (
          'Ninguém do mundo ativo escolheu Invocador ou Mago ainda: mostrando as duas classes.'
        ) : (
          'Sem mundo ativo: mostrando as duas classes.'
        )}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {DUO.map((d) => (
          <div key={d.key} className="rounded-lg border border-line bg-bg/50 p-3">
            <h3 className="mt-0! mb-2! text-lg!">
              {d.label}
              {names(d.cls).length > 0 && <span className="ml-2 text-sm font-normal text-muted">{names(d.cls).join(', ')}</span>}
            </h3>
            {guide.type === 'item' ? (
              <DuoItemBlock block={(guide.duo as { summoner: DuoItem; mage: DuoItem })[d.key]} book={book} />
            ) : (
              <DuoStages entries={(guide.duo as { summoner: DuoStage[]; mage: DuoStage[] })[d.key]} current={stage?.id} book={book} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DuoItemBlock({ block, book }: { block: DuoItem; book: RecipeBook }) {
  return (
    <>
      <p className="mt-0">
        <RichText text={block.text} book={book} />
      </p>
      {block.alt && block.alt.length > 0 && <Group group={{ label: 'Alternativas', items: block.alt }} book={book} />}
    </>
  )
}

function DuoStages({ entries, current, book }: { entries: DuoStage[]; current?: string; book: RecipeBook }) {
  // Etapa "sua": a última do guia que o mundo já alcançou (sem mundo, nenhuma é destacada)
  const now = current ? stageIndex(current) : -1
  let mine = -1
  entries.forEach((e, i) => {
    if (stageIndex(e.stage) <= now) mine = i
  })
  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={e.stage} className={i === mine ? 'rounded-lg border border-gold/50 bg-gold/10 p-2' : ''}>
          <p className="m-0! text-xs font-semibold tracking-wide text-muted uppercase">
            {STAGES.find((s) => s.id === e.stage)?.label ?? e.stage}
            {i === mine && <span className="ml-2 text-gold">· sua etapa</span>}
          </p>
          {e.note && (
            <p className="mt-1 mb-0 text-sm">
              <RichText text={e.note} book={book} />
            </p>
          )}
          <Group group={{ items: e.take as ItemRef[] }} book={book} />
        </div>
      ))}
    </div>
  )
}

