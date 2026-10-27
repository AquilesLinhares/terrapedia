import { useEffect, useMemo, useState } from 'react'
import { ClassContext, ExclusiveBadge } from '../../components/ClassItems'
import ItemChip, { Sprite } from '../../components/ItemChip'
import { cardClass, Loading, selectClass, SetChip, StagePicker, ToolHeader, toolName } from '../../components/ToolsUI'
import {
  accessoryOptions,
  armorOptions,
  BUFF_SOURCES,
  compute,
  EMPTY_LOADOUT,
  GEAR_AVAILABILITY,
  isAvailable,
  SLOT_LABELS,
  SLOTS,
  suggest,
  type Loadout,
} from '../../lib/minionCalc'
import type { ExclusiveMode } from '../../lib/classGuides'
import { milestone, STAGES } from '../../lib/progression'
import { activeWorld, useWorld } from '../../lib/world'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { loadAllExclusive, useDefeated, useToolsData, useToolStage, type ToolsData } from '../../lib/toolsData'

const SAVE_KEY = 'terrapedia:minion-loadout'

function savedLoadout(): Loadout {
  try {
    return { ...EMPTY_LOADOUT, ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') }
  } catch {
    return EMPTY_LOADOUT
  }
}

/** "a partir de Modo Difícil, depois de Abelha Rainha" */
function whenText(name: string) {
  const a = GEAR_AVAILABILITY[name]
  if (!a) return ''
  const stage = STAGES.find((s) => s.id === a.stage)!
  const needs = a.needs ? milestone(a.needs)?.pt : null
  return [stage.id !== 'start' && `a partir de ${stage.label}`, needs && `depois de ${needs}`].filter(Boolean).join(', ')
}

/** `/ferramentas/lacaios`: soma vagas de lacaio/sentinela e sugere a melhor montagem na etapa. */
export default function MinionCalcPage() {
  const book = useRecipeBook()
  const data = useToolsData()
  const [loadout, setLoadout] = useState<Loadout>(savedLoadout)

  useEffect(() => {
    document.title = 'Calculadora de lacaios · Terrapedia'
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(loadout))
    } catch {
      // sem localStorage: a montagem vale até fechar a página
    }
  }, [loadout])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader
        title="Calculadora de lacaios"
        subtitle="Escolha armadura, acessórios e poções/mesas para somar as vagas de lacaio e de sentinela."
      />
      {!book || !data ? <Loading /> : <Calculator book={book} data={data} loadout={loadout} setLoadout={setLoadout} />}
    </div>
  )
}

function Calculator({
  book,
  data,
  loadout,
  setLoadout,
}: {
  book: RecipeBook
  data: ToolsData
  loadout: Loadout
  setLoadout: (l: Loadout) => void
}) {
  const { stage } = useToolStage()
  const defeated = useDefeated()
  const armor = useMemo(() => armorOptions(data), [data])
  const accessories = useMemo(() => accessoryOptions(data), [data])
  const result = compute(data, loadout)
  const worldMode = activeWorld(useWorld())?.mode ?? null
  const [exclusive, setExclusive] = useState<Record<string, ExclusiveMode>>({})
  useEffect(() => {
    loadAllExclusive().then(setExclusive)
  }, [])
  const ctx = useMemo(() => ({ book, exclusive, worldMode, names: {} }), [book, exclusive, worldMode])

  const toggle = (key: 'accessories' | 'buffs', name: string) =>
    setLoadout({ ...loadout, [key]: loadout[key].includes(name) ? loadout[key].filter((n) => n !== name) : [...loadout[key], name] })

  const availableNote = (name: string, set?: string) => (isAvailable(set ?? name, stage, defeated) ? '' : ' · mais tarde')

  return (
    <ClassContext.Provider value={ctx}>
    <div className="space-y-5">
      <Suggestion book={book} data={data} onUse={setLoadout} />

      <section className={`${cardClass} space-y-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">Sua montagem</h2>
          <button type="button" onClick={() => setLoadout(EMPTY_LOADOUT)} className="text-sm text-muted hover:text-ink">
            Limpar
          </button>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Armadura</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SLOTS.map((slot) => (
              <label key={slot} className="flex min-w-0 flex-col gap-1 text-xs text-muted">
                {SLOT_LABELS[slot]}
                <select
                  value={loadout[slot] ?? ''}
                  onChange={(e) => setLoadout({ ...loadout, [slot]: e.target.value || null })}
                  className={`${selectClass} w-full`}
                >
                  <option value="">Outra (sem vagas)</option>
                  {armor[slot].map((p) => {
                    const e = data.equip[p.name] ?? {}
                    const bonus = [e.maxMinions && `+${e.maxMinions} lacaio`, e.maxTurrets && `+${e.maxTurrets} sentinela`].filter(Boolean).join(', ')
                    return (
                      <option key={p.name} value={p.name}>
                        {ptName(book, p.name)}
                        {bonus ? ` (${bonus})` : ''}
                        {availableNote(p.name, p.set)}
                      </option>
                    )
                  })}
                </select>
              </label>
            ))}
          </div>
          {result.set ? (
            <p className="mt-2 text-sm text-accent">Conjunto completo: {toolName(book, result.set)} — o bônus de conjunto conta.</p>
          ) : (
            <p className="mt-2 text-xs text-muted">O bônus de conjunto só conta com as três peças do mesmo conjunto.</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Acessórios</h3>
          <div className="flex flex-wrap gap-2">
            {accessories.map((a) => (
              <Toggle key={a.name} book={book} name={a.name} on={loadout.accessories.includes(a.name)} onClick={() => toggle('accessories', a.name)}>
                {a.minions ? `+${a.minions} lacaio` : '+1 sentinela'}
                {availableNote(a.name)}
              </Toggle>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Os acessórios do Exército do Ancião dão +1 sentinela, mas não somam entre si.</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Poções e mesas</h3>
          <div className="flex flex-wrap gap-2">
            {BUFF_SOURCES.map((b) => (
              <Toggle key={b.item} book={book} name={b.item} on={loadout.buffs.includes(b.item)} onClick={() => toggle('buffs', b.item)}>
                {b.minions ? '+1 lacaio' : '+1 sentinela'}
                {availableNote(b.item)}
              </Toggle>
            ))}
          </div>
        </div>
      </section>

      <section className={cardClass} aria-live="polite">
        <div className="grid grid-cols-2 gap-3">
          <Total label="Lacaios" value={result.minions} />
          <Total label="Sentinelas" value={result.sentries} />
        </div>
        <ul className="mt-4 divide-y divide-line/60 text-sm">
          {result.lines.map((line, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="mr-2 text-xs text-muted">{line.label}</span>
                {line.item && data.sets[line.item] ? (
                  <SetChip book={book} set={line.item} icon={data.sets[line.item].pieces[0]} showEn={false} />
                ) : line.item ? (
                  <>
                    <ItemChip book={book} name={line.item} size="sm" showEn={false} />
                    <ExclusiveBadge name={line.item} />
                  </>
                ) : (
                  <span>vaga inicial</span>
                )}
                {line.note && <span className="block text-xs text-muted">{line.note}</span>}
              </span>
              <span className="shrink-0 text-right font-semibold whitespace-nowrap">
                {line.minions > 0 && <span className="text-gold">+{line.minions} lacaio</span>}
                {line.minions > 0 && line.sentries > 0 && ' · '}
                {line.sentries > 0 && <span className="text-accent">+{line.sentries} sentinela</span>}
                {!line.minions && !line.sentries && <span className="text-muted">+0</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
    </ClassContext.Provider>
  )
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg/60 p-3 text-center">
      <div className="font-display text-4xl font-bold text-gold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  )
}

function Toggle({ book, name, on, onClick, children }: { book: RecipeBook; name: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition ${
        on ? 'border-gold bg-gold/10' : 'border-line hover:border-accent'
      }`}
    >
      <Sprite book={book} name={name} size="sm" />
      <span className="leading-tight">
        <span className={`block font-medium ${on ? 'text-gold' : 'text-ink'}`}>{ptName(book, name)}
          <ExclusiveBadge name={name} />
        </span>
        <span className="block text-xs text-muted">{children}</span>
      </span>
    </button>
  )
}

/** Cartão "Melhor combinação na etapa" (etapa do mundo ativo ou escolhida). */
function Suggestion({ book, data, onUse }: { book: RecipeBook; data: ToolsData; onUse: (l: Loadout) => void }) {
  const { stage } = useToolStage()
  const defeated = useDefeated()
  const [focus, setFocus] = useState<'minions' | 'sentries'>('minions')
  const best = suggest(data, stage, defeated, focus)
  const total = compute(data, best)
  const set = total.set ?? (best.body && data.sets[best.body] ? best.body : null)

  // Próximo conjunto que daria mais vagas (e o que falta para ele)
  const next = Object.entries(data.sets)
    .filter(([s, info]) => !isAvailable(s, stage, defeated) && info[focus] > (set ? data.sets[set][focus] : 0))
    .sort(([a], [b]) => STAGES.findIndex((s) => s.id === GEAR_AVAILABILITY[a]?.stage) - STAGES.findIndex((s) => s.id === GEAR_AVAILABILITY[b]?.stage))[0]

  return (
    <section className={`${cardClass} space-y-3 border-gold/40`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-gold">Melhor combinação</h2>
        <div className="flex rounded-lg border border-line p-0.5 text-sm" role="radiogroup" aria-label="Foco">
          {(['minions', 'sentries'] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={focus === f}
              onClick={() => setFocus(f)}
              className={`rounded-md px-3 py-1 ${focus === f ? 'bg-gold/15 font-semibold text-gold' : 'text-muted hover:text-ink'}`}
            >
              {f === 'minions' ? 'Lacaios' : 'Sentinelas'}
            </button>
          ))}
        </div>
      </div>
      <StagePicker />
      {defeated === null && (
        <p className="text-xs text-muted">Sem mundo ativo, itens que dependem de chefes opcionais (ex.: Abelha Rainha) entram na conta.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {set ? (
          data.sets[set].pieces.length > 1 ? (
            <SetChip book={book} set={set} icon={data.sets[set].pieces[0]} />
          ) : (
            <ItemChip book={book} name={set} />
          )
        ) : (
          <span className="text-sm text-muted">Nenhuma armadura de invocador ainda.</span>
        )}
        {best.accessories.map((a) => (
          <ItemChip key={a} book={book} name={a} />
        ))}
        {best.buffs.map((b) => (
          <ItemChip key={b} book={book} name={b} />
        ))}
      </div>
      <p className="text-sm">
        Total: <span className="font-bold text-gold">{total.minions} lacaios</span> e{' '}
        <span className="font-bold text-accent">{total.sentries} sentinelas</span>.
        {focus === 'minions' && best.accessories.length < 5 && ' Use os espaços de acessório que sobram para dano ou defesa.'}
      </p>
      {next && (
        <p className="text-sm text-muted">
          Próximo passo: <span className="text-ink">{toolName(book, next[0])}</span> (+{next[1][focus]} {focus === 'minions' ? 'lacaios' : 'sentinelas'}),{' '}
          {whenText(next[0])}.
        </p>
      )}
      <button
        type="button"
        onClick={() => onUse(best)}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-bg transition hover:brightness-110"
      >
        Usar esta combinação
      </button>
    </section>
  )
}
