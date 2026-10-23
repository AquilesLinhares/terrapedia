import { Link } from 'react-router-dom'
import { matchesSub, type ClassGuide, type ClassItem, type ClassStage } from '../lib/classGuides'
import { milestone, STAGES } from '../lib/progression'
import { BigItem, itemKey, SmallItem, useClassCtx } from './ClassItems'
import { RichText } from './GuideView'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import { articlePath } from './SearchBar'

const card = 'rounded-xl border border-line bg-panel/80 p-3 sm:p-4'
const cardTitle = 'mb-2.5 font-display text-lg font-bold text-gold'

/** Aba "Resumo": o melhor no geral de uma etapa, em cartões. */
export default function ClassSummary({
  guide,
  stage,
  sub,
  onStage,
}: {
  guide: ClassGuide
  stage: ClassStage
  sub: string | null
  onStage: (id: string) => void
}) {
  const { book } = useClassCtx()
  const index = guide.stages.indexOf(stage)
  const prev = guide.stages[index - 1]
  const next = guide.stages[index + 1]
  const label = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id
  const subLabel = (id: string) => guide.subclasses.find((s) => s.id === id)?.label ?? id
  const weapons = stage.weapons.filter((w) => !sub || w.sub === sub)
  const accessories = stage.accessories.filter((a) => matchesSub(a, sub))
  const buffs = stage.buffs.filter((b) => matchesSub(b, sub))
  const ammo = stage.ammo?.filter((a) => matchesSub(a, sub))

  return (
    <div className="space-y-4">
      <p className="text-base leading-relaxed text-ink/90">
        <RichText text={stage.summary} book={book} />
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h3 className={cardTitle}>Armadura</h3>
          <BigItem item={stage.armor} label="Melhor no geral" />
          {stage.armorAlt && <Alternatives items={stage.armorAlt} />}
        </section>

        <section className={card}>
          <h3 className={cardTitle}>Armas</h3>
          <div className="space-y-2.5">
            {weapons.map((w) => (
              <div key={w.sub}>
                {w.item ? (
                  <>
                    <BigItem item={w.item} label={subLabel(w.sub)} />
                    {w.note && (
                      <p className="mt-1 px-1 text-xs text-ink/75">
                        <RichText text={w.note} book={book} />
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-line px-3 py-2.5 text-sm text-ink/75">
                    <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">{subLabel(w.sub)}</span>
                    {w.note && <RichText text={w.note} book={book} />}
                  </div>
                )}
                {w.alt && <Alternatives items={w.alt} />}
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h3 className={cardTitle}>Acessórios</h3>
          <ItemGrid items={accessories} />
        </section>

        <section className={card}>
          <h3 className={cardTitle}>Poções e buffs</h3>
          <ItemGrid items={buffs} />
        </section>

        {ammo && (
          <section className={`${card} lg:col-span-2`}>
            <h3 className={cardTitle}>Munição</h3>
            <ItemGrid items={ammo} wide />
          </section>
        )}
      </div>

      <NextStep stage={stage} />

      {guide.class === 'summoner' && (
        <Link to="/ferramentas/lacaios" className={`${card} flex items-center justify-between gap-3 hover:border-accent hover:no-underline`}>
          <span>
            <span className="block font-display text-lg font-bold text-ink">Calculadora de lacaios</span>
            <span className="block text-sm text-muted">Some as vagas de lacaio e sentinela da sua armadura, acessórios e poções.</span>
          </span>
          <span className="text-accent">→</span>
        </Link>
      )}

      <nav className="flex items-stretch justify-between gap-2 pt-1" aria-label="Outras etapas">
        {prev ? (
          <button type="button" onClick={() => onStage(prev.stage)} className="flex min-w-0 items-center gap-1 rounded-lg px-2 py-2 text-left text-sm text-muted transition hover:bg-panel hover:text-ink">
            <ChevronLeftIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label(prev.stage)}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" onClick={() => onStage(next.stage)} className="flex min-w-0 items-center gap-1 rounded-lg px-2 py-2 text-right text-sm text-muted transition hover:bg-panel hover:text-ink">
            <span className="truncate">{label(next.stage)}</span>
            <ChevronRightIcon className="h-4 w-4 shrink-0" />
          </button>
        )}
      </nav>
    </div>
  )
}

function Alternatives({ items }: { items: ClassItem[] }) {
  return (
    <div className="mt-2 px-1">
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">Também servem</span>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={itemKey(item, i)} className="min-w-0">
            <SmallItem item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ItemGrid({ items, wide }: { items: ClassItem[]; wide?: boolean }) {
  if (!items.length) return <p className="text-sm text-muted">Nada específico para este filtro.</p>
  return (
    <ul className={`grid grid-cols-1 gap-x-3 gap-y-2 text-sm min-[420px]:grid-cols-2 ${wide ? 'lg:grid-cols-4' : ''}`}>
      {items.map((item, i) => (
        <li key={itemKey(item, i)} className="min-w-0">
          <SmallItem item={item} />
        </li>
      ))}
    </ul>
  )
}

/** "O que fazer a seguir": próximo chefe, opcionais, preparação e arena. */
export function NextStep({ stage }: { stage: ClassStage }) {
  const { book } = useClassCtx()
  const { target, optional, prep, arena } = stage.next
  const boss = target ? milestone(target) : undefined
  return (
    <section className={`${card} border-gold/40`}>
      <h3 className={cardTitle}>O que fazer a seguir</h3>
      {boss && (
        <Link to={articlePath(boss.key)} className="group mb-3 flex items-center gap-3 rounded-lg bg-bg/40 p-2.5 hover:no-underline">
          <img src={boss.icon} alt="" className="pixelated h-10 w-10 object-contain" loading="lazy" />
          <span className="leading-tight">
            <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">Próximo {boss.kind}</span>
            <span className="font-display text-xl font-bold text-ink group-hover:underline">{boss.pt}</span>
            <span className="ml-2 text-xs text-muted">{boss.key}</span>
          </span>
        </Link>
      )}
      {optional && optional.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Antes, se quiser</h4>
          <ul className="space-y-1 text-sm">
            {optional.map((o) => {
              const m = milestone(o.key)
              return (
                <li key={o.key} className="flex items-start gap-2">
                  {m && <img src={m.icon} alt="" className="pixelated mt-0.5 h-5 w-5 shrink-0 object-contain" loading="lazy" />}
                  <span>
                    <Link to={articlePath(o.key)} className="font-semibold text-accent hover:underline">
                      {m?.pt ?? o.key}
                    </Link>
                    : <RichText text={o.why} book={book} />
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{boss ? 'Preparação' : 'Daqui pra frente'}</h4>
          <Bullets texts={prep} />
        </div>
        {arena && (
          <div>
            <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">Arena</h4>
            <Bullets texts={arena} />
          </div>
        )}
      </div>
    </section>
  )
}

function Bullets({ texts }: { texts: string[] }) {
  const { book } = useClassCtx()
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/90 marker:text-gold/70">
      {texts.map((t, i) => (
        <li key={i}>
          <RichText text={t} book={book} />
        </li>
      ))}
    </ul>
  )
}
