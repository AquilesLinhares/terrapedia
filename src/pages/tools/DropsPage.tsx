import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ItemChip from '../../components/ItemChip'
import { articlePath } from '../../components/SearchBar'
import { cardClass, ItemPicker, Loading, selectClass, StagePicker, ToolHeader } from '../../components/ToolsUI'
import { stageAtLeast } from '../../lib/progression'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useToolsData, useToolStage, type ToolsData } from '../../lib/toolsData'
import { activeWorld, MODE_LABELS, useWorld, type WorldMode } from '../../lib/world'

type Entry = ToolsData['drops'][string][number]

const MODE_KEY = 'terrapedia:drops-mode'
const COUNT_KEY = 'terrapedia:drop-counters'
const TARGETS = [0.5, 0.9, 0.99]

// ---------- Armazenamento no aparelho ----------

const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // sem localStorage: vale até fechar a página
  }
  listeners.forEach((l) => l())
}

/** Contador de tentativas por "item|fonte", salvo no aparelho. */
function useCounters() {
  const raw = useSyncExternalStore(subscribe, () => read(COUNT_KEY))
  const counts = useMemo<Record<string, number>>(() => {
    try {
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [raw])
  return {
    counts,
    set(key: string, value: number) {
      const next = { ...counts }
      if (value > 0) next[key] = Math.min(value, 9_999_999)
      else delete next[key]
      write(COUNT_KEY, JSON.stringify(next))
    },
  }
}

/** Modo do jogo: o do mundo ativo; sem mundo, o escolhido aqui. */
function useDropMode() {
  const world = activeWorld(useWorld())
  const saved = useSyncExternalStore(subscribe, () => read(MODE_KEY))
  const local: WorldMode = saved === 'expert' || saved === 'master' ? saved : 'classic'
  return {
    mode: world?.mode ?? local,
    fromWorld: !!world,
    setMode: (m: WorldMode) => write(MODE_KEY, m),
  }
}

// ---------- Números ----------

const BR = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 4 })
const fmtPct = (p: number) => `${BR.format(p)}%`
/** Probabilidade acumulada (0–1) após n tentativas, chance p em %. */
const cumulative = (p: number, n: number) => 1 - Math.pow(1 - Math.min(p, 100) / 100, n)
/** Tentativas para chegar a `target` (0–1) de chance. */
function triesFor(p: number, target: number) {
  if (p >= 100) return 1
  return Math.ceil(Math.log(1 - target) / Math.log(1 - p / 100))
}
const fmtInt = (n: number) => n.toLocaleString('pt-BR')

// ---------- Peças ----------

function SourceName({ book, name }: { book: RecipeBook; name: string }) {
  const pt = ptName(book, name)
  return (
    <Link to={articlePath(name.replace(/ \(.*\)$/, ''))} className="group inline-flex min-w-0 flex-col leading-tight hover:no-underline">
      <span className="font-medium text-accent group-hover:underline">{pt}</span>
      {pt !== name && <span className="text-xs text-muted">{name}</span>}
    </Link>
  )
}

function Chance({ entry }: { entry: Entry }) {
  const p = entry[1]
  if (p == null)
    return (
      <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300" title="A wiki não traz a chance deste drop">
        conferir
      </span>
    )
  return (
    <span className="whitespace-nowrap font-semibold text-gold" title={p > 0 && p < 100 ? `cerca de 1 em ${fmtInt(Math.round(100 / p))}` : undefined}>
      {fmtPct(p)}
    </span>
  )
}

interface Row {
  /** Item que cai */
  item: string
  /** De quem / de onde */
  source: string
  entry: Entry
}

const rowKey = (r: Row) => `${r.item}|${r.source}`

/** `/ferramentas/drops?item=...` ou `?inimigo=...`: quem dropa o quê, chance e quantos abates são necessários. */
export default function DropsPage() {
  const book = useRecipeBook()
  const data = useToolsData()
  const { stage } = useToolStage()
  const { mode, fromWorld, setMode } = useDropMode()
  const { counts, set: setCount } = useCounters()
  const [params, setParams] = useSearchParams()
  const [sel, setSel] = useState<string | null>(null)
  const [tries, setTries] = useState('')

  useEffect(() => {
    document.title = 'Farm de drops · Terrapedia'
  }, [])

  const { itemNames, sourceNames, bySource } = useMemo(() => {
    const bySource = new Map<string, Row[]>()
    for (const [item, entries] of Object.entries(data?.drops ?? {}))
      for (const entry of entries) bySource.set(entry[0], [...(bySource.get(entry[0]) ?? []), { item, source: entry[0], entry }])
    return { itemNames: Object.keys(data?.drops ?? {}), sourceNames: [...bySource.keys()], bySource }
  }, [data])
  const allNames = useMemo(() => [...itemNames, ...sourceNames], [itemNames, sourceNames])

  const item = params.get('item')
  const enemy = params.get('inimigo')
  const rows: Row[] = useMemo(() => {
    if (item && data?.drops[item]) return data.drops[item].map((entry) => ({ item, source: entry[0], entry }))
    if (enemy && bySource.has(enemy)) return bySource.get(enemy)!
    return []
  }, [item, enemy, data, bySource])
  // Maior chance primeiro; "conferir" por último
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.entry[1] ?? -1) - (a.entry[1] ?? -1)), [rows])

  const pick = (name: string) => {
    const next = new URLSearchParams()
    next.set(data?.drops[name] ? 'item' : 'inimigo', name)
    setSel(null)
    setParams(next, { replace: true })
  }
  const clear = () => {
    setSel(null)
    setParams(new URLSearchParams(), { replace: true })
  }

  if (!book || !data)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <ToolHeader title="Farm de drops" subtitle="Quem dropa o quê, a chance e quantos abates você precisa." />
        <Loading />
      </div>
    )

  const hardmodeLocked = (name: string) => !!data.items.get(name)?.hardmode && !stageAtLeast(stage, 'hardmode')
  const onlyExpert = (r: Row) => r.entry[2] === 'expert' && mode === 'classic'
  const current = sorted.find((r) => rowKey(r) === sel) ?? sorted.find((r) => r.entry[1] != null && !onlyExpert(r)) ?? null
  const p = current?.entry[1] ?? null
  const key = current ? rowKey(current) : ''
  const count = key ? (counts[key] ?? 0) : 0
  const x = tries === '' ? count : Math.max(0, Math.floor(Number(tries)) || 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader title="Farm de drops" subtitle="Quem dropa o quê, a chance e quantos abates você precisa." />
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <ItemPicker book={book} names={allNames} onPick={pick} placeholder="Buscar item ou inimigo (português ou inglês)" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <StagePicker />
            {fromWorld ? (
              <p className="text-sm text-muted">
                Modo do mundo ativo: <span className="font-semibold text-ink">{MODE_LABELS[mode]}</span>
              </p>
            ) : (
              <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
                Modo:
                <select value={mode} onChange={(e) => setMode(e.target.value as WorldMode)} className={selectClass}>
                  {(Object.keys(MODE_LABELS) as WorldMode[]).map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>

        {sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Busque um item (ex.: “Pocket Mirror”) para ver quem o dropa, ou um inimigo para ver o que ele solta.
          </p>
        ) : (
          <>
            <section className={cardClass}>
              <div className="flex items-center gap-2">
                <h2 className="min-w-0 flex-1 font-display text-lg font-bold text-ink">
                  {item ? (
                    <>Quem dropa: {ptName(book, item)}</>
                  ) : (
                    <>O que {ptName(book, enemy ?? '')} dropa</>
                  )}
                </h2>
                <button type="button" onClick={clear} className="text-sm text-muted hover:text-ink">
                  limpar
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                Toque numa linha para usá-la na calculadora. Nenhum dado da wiki separa a chance por modo: o número é o listado lá
                {mode !== 'classic' && `; em ${MODE_LABELS[mode]} a chance real pode ser maior`} (conferir na página do item). Drops marcados “só Expert+”
                não existem no Clássico.
              </p>
              <ul className="mt-2 divide-y divide-line">
                {sorted.map((r) => {
                  const locked = onlyExpert(r)
                  const on = current !== null && rowKey(r) === rowKey(current)
                  return (
                    <li key={rowKey(r)}>
                      <button
                        type="button"
                        onClick={() => setSel(rowKey(r))}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition ${
                          on ? 'bg-gold/10 ring-1 ring-gold/60' : 'hover:bg-bg/40'
                        } ${locked ? 'opacity-50' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          {item ? <SourceName book={book} name={r.source} /> : <ItemChip book={book} name={r.item} />}
                        </span>
                        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {r.entry[2] === 'expert' && (
                            <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-muted">só Expert+</span>
                          )}
                          {!item && hardmodeLocked(r.item) && (
                            <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300">Modo Difícil</span>
                          )}
                          {(counts[rowKey(r)] ?? 0) > 0 && (
                            <span className="text-xs text-muted">{fmtInt(counts[rowKey(r)])} tent.</span>
                          )}
                          <Chance entry={r.entry} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {current && (
              <section className={`${cardClass} space-y-4`}>
                <h2 className="font-display text-lg font-bold text-ink">Calculadora</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <ItemChip book={book} name={current.item} size="sm" showEn={false} />
                  <span className="text-muted">de</span>
                  <span className="font-medium text-ink">{ptName(book, current.source)}</span>
                  <Chance entry={current.entry} />
                </div>

                {p == null ? (
                  <p className="text-sm text-amber-300">
                    A wiki não traz a chance deste drop: conferir na{' '}
                    <Link to={articlePath(current.item)} className="underline">
                      página do item
                    </Link>
                    . O contador abaixo ainda funciona.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {TARGETS.map((t) => (
                        <div key={t} className="rounded-lg bg-bg/50 p-3 text-center">
                          <p className="text-xs text-muted">Para {Math.round(t * 100)}% de chance</p>
                          <p className="font-display text-2xl font-bold text-gold tabular-nums">{fmtInt(triesFor(p, t))}</p>
                          <p className="text-xs text-muted">abates / tentativas</p>
                        </div>
                      ))}
                    </div>
                    <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      Após
                      <input
                        type="number"
                        min={0}
                        value={tries}
                        placeholder={String(count)}
                        onChange={(e) => setTries(e.target.value)}
                        className="h-10 w-28 rounded-lg border border-line bg-bg px-2 text-base text-ink focus:border-accent focus:outline-none"
                      />
                      abates (vazio = seu contador):
                      <span className="font-display text-xl font-bold text-gold tabular-nums">{fmtPct(cumulative(p, x) * 100)}</span>
                      de chance de já ter dropado
                    </label>
                  </>
                )}

                <div className="rounded-lg bg-bg/50 p-3">
                  <p className="text-sm text-muted">
                    Contador de tentativas <span className="text-xs">(salvo neste aparelho)</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="min-w-16 font-display text-3xl font-bold text-ink tabular-nums">{fmtInt(count)}</span>
                    {[1, 10, 100].map((n) => (
                      <CounterButton key={n} onClick={() => setCount(key, count + n)}>
                        +{n}
                      </CounterButton>
                    ))}
                    <CounterButton onClick={() => setCount(key, count - 1)}>−1</CounterButton>
                    <CounterButton onClick={() => setCount(key, 0)}>Zerar</CounterButton>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-xs text-muted">
          Dados da tabela Drops da Terraria Wiki (lidos em {data.source.date}). A chance vale por abate (ou por baú/saco aberto);
          a calculadora usa 1 − (1 − p)^abates.
        </p>
      </div>
    </div>
  )
}

function CounterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-full border border-line bg-panel px-3 text-sm text-ink/90 transition hover:border-accent"
    >
      {children}
    </button>
  )
}
