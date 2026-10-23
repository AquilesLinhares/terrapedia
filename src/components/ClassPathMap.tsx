import { useEffect, useMemo, useState } from 'react'
import type { ClassGuide, ClassItem, ClassPath } from '../lib/classGuides'
import { STAGES, type StageId } from '../lib/progression'
import { itemKey, ItemSprite, SmallItem, useClassCtx } from './ClassItems'
import { RichText } from './GuideView'
import { ChevronRightIcon, GlobeIcon } from './icons'

/**
 * Aba "Detalhado": todas as etapas numa linha do tempo, com os caminhos possíveis de cada uma.
 * Cada caminho diz em quais caminhos da etapa seguinte ele continua. Tocar num caminho destaca a
 * "linhagem" dele (de onde vem e para onde vai) e apaga o resto.
 */
export default function ClassPathMap({ guide, sub, worldStage }: { guide: ClassGuide; sub: string | null; worldStage: StageId | null }) {
  const [selected, setSelected] = useState<string | null>(null)

  // Ligações nos dois sentidos, para achar a linhagem do caminho escolhido
  const { byId, prev } = useMemo(() => {
    const byId = new Map<string, ClassPath>()
    const prev = new Map<string, string[]>()
    for (const st of guide.stages)
      for (const p of st.paths) {
        byId.set(p.id, p)
        for (const n of p.next ?? []) prev.set(n, [...(prev.get(n) ?? []), p.id])
      }
    return { byId, prev }
  }, [guide])

  const lineage = useMemo(() => {
    if (!selected) return null
    const seen = new Set<string>([selected])
    const walk = (id: string, step: (id: string) => string[]) => {
      for (const n of step(id)) if (!seen.has(n)) seen.add(n), walk(n, step)
    }
    walk(selected, (id) => byId.get(id)?.next ?? [])
    walk(selected, (id) => prev.get(id) ?? [])
    return seen
  }, [selected, byId, prev])

  // Abre na etapa do mundo ativo
  useEffect(() => {
    if (worldStage) document.getElementById(`mapa-${worldStage}`)?.scrollIntoView({ block: 'start' })
  }, [worldStage])

  function go(id: string) {
    setSelected(id)
    document.getElementById(`caminho-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div>
      <p className="mb-4 rounded-lg border border-line bg-panel/60 px-3 py-2 text-sm text-muted">
        Cada etapa tem alguns caminhos. Escolha o que combina com o que você já usa e siga as setas{' '}
        <ChevronRightIcon className="inline h-3.5 w-3.5 align-[-0.15em] text-gold" /> para a próxima etapa. Toque num caminho para destacar a
        linha dele.
        {selected && (
          <button type="button" onClick={() => setSelected(null)} className="ml-2 font-semibold text-accent hover:underline">
            Limpar destaque
          </button>
        )}
      </p>

      <ol className="relative ml-2 border-l-2 border-line/80 pl-5 sm:ml-3 sm:pl-7">
        {guide.stages.map((st) => {
          const stage = STAGES.find((s) => s.id === st.stage)
          const here = st.stage === worldStage
          return (
            <li key={st.stage} id={`mapa-${st.stage}`} className="relative scroll-mt-28 pb-8 last:pb-2">
              <span
                className={`absolute top-1 -left-[1.95rem] h-4 w-4 rounded-full border-2 sm:-left-[2.45rem] ${
                  here ? 'border-gold bg-gold shadow-[0_0_12px_rgba(242,201,76,0.6)]' : stage?.phase === 'hard' ? 'border-accent bg-bg' : 'border-line bg-bg'
                }`}
              />
              <h3 className="mb-3 flex flex-wrap items-center gap-2 font-display text-xl font-bold text-ink">
                {stage?.label ?? st.stage}
                {here && (
                  <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-sans text-xs font-semibold text-gold">
                    <GlobeIcon className="h-3.5 w-3.5" /> seu mundo está aqui
                  </span>
                )}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {st.paths.map((p) => (
                  <PathCard
                    key={p.id}
                    path={p}
                    guide={guide}
                    nextPaths={(p.next ?? []).map((id) => byId.get(id)!).filter(Boolean)}
                    selected={selected === p.id}
                    dim={(lineage !== null && !lineage.has(p.id)) || (sub !== null && !p.sub.includes(sub))}
                    onSelect={() => setSelected(selected === p.id ? null : p.id)}
                    onGo={go}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function PathCard({
  path,
  guide,
  nextPaths,
  selected,
  dim,
  onSelect,
  onGo,
}: {
  path: ClassPath
  guide: ClassGuide
  nextPaths: ClassPath[]
  selected: boolean
  dim: boolean
  onSelect: () => void
  onGo: (id: string) => void
}) {
  const { book } = useClassCtx()
  return (
    <article
      id={`caminho-${path.id}`}
      onClick={(e) => !(e.target as HTMLElement).closest('a, button') && onSelect()}
      className={`flex cursor-pointer flex-col rounded-xl border bg-panel/80 p-3 transition sm:p-4 ${
        selected ? 'border-gold ring-2 ring-gold/30' : 'border-line hover:border-accent/60'
      } ${dim ? 'opacity-40' : ''}`}
    >
      <header className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="font-display text-lg leading-tight font-bold text-gold">{path.title}</h4>
        <span className="flex shrink-0 gap-0.5" aria-label="Subclasses">
          {path.sub.map((id) => {
            const s = guide.subclasses.find((x) => x.id === id)
            return s ? (
              <span key={id} title={s.label}>
                <ItemSprite item={s.icon} size="sm" />
              </span>
            ) : null
          })}
        </span>
      </header>
      <p className="mb-2.5 text-sm text-ink/80">
        <RichText text={path.when} book={book} />
      </p>

      <ItemRow label="Armadura" items={path.armor} />
      <ItemRow label="Armas" items={path.weapons} />
      {path.extras && <ItemRow label="Junto" items={path.extras} />}

      <div className="mt-2 grid gap-2 text-sm min-[420px]:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2">
        <ProsCons kind="pro" texts={path.pros} />
        <ProsCons kind="con" texts={path.cons} />
      </div>

      {nextPaths.length > 0 && (
        <footer className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-2.5 text-xs">
          <span className="text-muted">Continua em</span>
          {nextPaths.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onGo(n.id)}
              className="flex items-center gap-0.5 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-semibold text-gold transition hover:bg-gold/20"
            >
              {n.title}
              <ChevronRightIcon className="h-3 w-3" />
            </button>
          ))}
        </footer>
      )}
    </article>
  )
}

function ItemRow({ label, items }: { label: string; items: ClassItem[] }) {
  return (
    <div className="mb-2">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {items.map((item, i) => (
          <li key={itemKey(item, i)} className="min-w-0">
            <SmallItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProsCons({ kind, texts }: { kind: 'pro' | 'con'; texts: string[] }) {
  const { book } = useClassCtx()
  const pro = kind === 'pro'
  return (
    <div className={`rounded-lg px-2.5 py-2 ${pro ? 'bg-emerald-400/8' : 'bg-rose-400/8'}`}>
      <span className={`text-[11px] font-semibold tracking-wide uppercase ${pro ? 'text-emerald-300' : 'text-rose-300'}`}>{pro ? 'Prós' : 'Contras'}</span>
      <ul className="mt-0.5 space-y-0.5">
        {texts.map((t, i) => (
          <li key={i} className="flex gap-1.5 leading-snug text-ink/85">
            <span aria-hidden className={pro ? 'text-emerald-300' : 'text-rose-300'}>
              {pro ? '+' : '−'}
            </span>
            <span>
              <RichText text={t} book={book} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
