import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RichText } from '../../components/GuideView'
import ItemChip from '../../components/ItemChip'
import RecipeList from '../../components/RecipeList'
import { articlePath } from '../../components/SearchBar'
import { cardClass, Loading, StagePicker, ToolHeader } from '../../components/ToolsUI'
import { BOSS_PREP } from '../../lib/bossPrep'
import { SUMMON_LIST, SUMMONS, type SummonInfo } from '../../lib/bossSummons'
import { MILESTONES, milestoneStage, STAGES, stageAtLeast, type Milestone, type StageId } from '../../lib/progression'
import { useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useDefeated, useToolStage } from '../../lib/toolsData'

type Status = 'done' | 'ready' | 'locked'

function statusOf(info: SummonInfo, stage: StageId, defeated: Set<string> | null): Status {
  if (defeated?.has(info.key)) return 'done'
  if (!stageAtLeast(stage, info.after)) return 'locked'
  const needs = info.needs ?? []
  const ok = defeated ? needs.every((k) => defeated.has(k)) : needs.every((k) => stageAtLeast(stage, milestoneStage(k)))
  return ok ? 'ready' : 'locked'
}

const STATUS_LABEL: Record<Status, { label: string; tone: string }> = {
  done: { label: 'Derrotado ✓', tone: 'bg-green-500/15 text-green-400' },
  ready: { label: 'Possível agora', tone: 'bg-gold/15 text-gold' },
  locked: { label: 'Ainda não', tone: 'bg-bg/70 text-muted' },
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gold">{label}</h3>
      <p className="text-ink">{children}</p>
    </div>
  )
}

function Details({ info, m, status, book }: { info: SummonInfo; m: Milestone; status: Status; book: RecipeBook }) {
  const missing = (info.needs ?? []).map((k) => MILESTONES.find((x) => x.key === k)?.pt ?? k)
  return (
    <div className="space-y-3 border-t border-line px-3 pt-3 pb-4 sm:px-4">
      {status === 'locked' && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Precisa chegar em <strong>{STAGES.find((s) => s.id === info.after)?.label}</strong>
          {missing.length > 0 && <> e derrotar {missing.join(' e ')}</>}.
        </p>
      )}
      {info.summon.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gold">Como invocar</h3>
          {info.summon.map((s) => {
            const recipes = book.byResult.get(s.item) ?? []
            return (
              <div key={s.item} className="mt-1">
                <ItemChip book={book} name={s.item} />
                {s.note && (
                  <p className="ml-10 text-sm text-muted">
                    <RichText text={s.note} book={book} />
                  </p>
                )}
                {recipes.length > 0 && <RecipeList book={book} recipes={recipes} limit={2} />}
              </div>
            )
          })}
          {info.how && (
            <p className="mt-1 text-ink">
              <RichText text={info.how} book={book} />
            </p>
          )}
        </div>
      )}
      {info.summon.length === 0 && info.how && (
        <Field label="Como começar">
          <RichText text={info.how} book={book} />
        </Field>
      )}
      <Field label="Onde">
        <RichText text={info.where} book={book} />
      </Field>
      <Field label="Acontece sozinho?">{info.natural ? <RichText text={info.natural} book={book} /> : 'Não: só invocando.'}</Field>
      {info.requires && (
        <Field label="Antes, você precisa">
          <RichText text={info.requires} book={book} />
        </Field>
      )}
      {info.note && (
        <p className="text-sm text-muted">
          <RichText text={info.note} book={book} />
        </p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <Link to={articlePath(info.key)} className="text-accent hover:underline">
          Página de {m.pt}
        </Link>
        {BOSS_PREP.some((b) => b.key === info.key) && (
          <>
            <Link to={`/ferramentas/buffs?chefe=${encodeURIComponent(info.key)}`} className="text-accent hover:underline">
              Checklist de buffs
            </Link>
            <Link to={`/ferramentas/arena?chefe=${encodeURIComponent(info.key)}`} className="text-accent hover:underline">
              Arena
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

/** `/ferramentas/condicoes?chefe=...`: como invocar cada chefe/evento e o que já é possível na etapa do mundo. */
export default function ConditionsPage() {
  const book = useRecipeBook()
  const { stage } = useToolStage()
  const defeated = useDefeated()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'ready'>('all')
  const open = params.get('chefe')

  useEffect(() => {
    document.title = 'Condições de chefes e eventos · Terrapedia'
  }, [])

  const items = SUMMON_LIST.map((m) => ({ m, info: SUMMONS[m.key], status: statusOf(SUMMONS[m.key], stage, defeated) }))
  const visible = items.filter((x) => filter === 'all' || x.status === 'ready')
  const toggle = (key: string) => setParams(open === key ? {} : { chefe: key }, { replace: true })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader title="Condições de chefes e eventos" subtitle="Como invocar, onde, quando acontece sozinho e o que precisa antes." />
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <StagePicker />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filtro">
            {(
              [
                ['all', 'Todos'],
                ['ready', `Possível agora (${items.filter((x) => x.status === 'ready').length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={filter === id}
                onClick={() => setFilter(id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  filter === id ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            "Possível agora" usa a etapa {defeated ? 'e os chefes derrotados do mundo ativo' : 'escolhida'}. Toque num nome para ver os detalhes.
          </p>
        </section>

        {!book ? (
          <Loading />
        ) : (
          <ul className="space-y-2">
            {visible.map(({ m, info, status }) => {
              const s = STATUS_LABEL[status]
              const isOpen = open === m.key
              return (
                <li key={m.key} className={`overflow-hidden rounded-xl border bg-panel ${isOpen ? 'border-gold/50' : 'border-line'}`}>
                  <button type="button" onClick={() => toggle(m.key)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4">
                    <img src={m.icon} alt="" loading="lazy" className="pixelated h-9 w-9 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block font-display text-lg font-bold text-ink">{m.pt}</span>
                      <span className="block truncate text-xs text-muted">
                        {m.key} · {m.kind}
                        {m.optional ? ' opcional' : ''}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                  </button>
                  {isOpen && <Details info={info} m={m} status={status} book={book} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
