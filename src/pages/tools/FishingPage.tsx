import { useEffect, useMemo, useState } from 'react'
import ItemChip from '../../components/ItemChip'
import { cardClass, Loading, selectClass, StagePicker, ToolHeader } from '../../components/ToolsUI'
import {
  ANGLER_ACCESSORIES,
  ANGLER_DECORATIONS,
  ANGLER_FACTS,
  ANGLER_FIXED,
  ANGLER_POTIONS,
  ANGLER_RANDOM,
  BIOMES,
  BIOME_PRIORITY,
  CRATES,
  CRATES_WITHOUT_DATA,
  CRATE_FACTS,
  FISHING_CHECK_COUNT,
  FISHING_LAYERS,
  FISHING_SOURCE_DATE,
  FOOD_FISH,
  POTION_FISH,
  QUEST_FISH,
  type BiomeId,
  type Crate,
} from '../../lib/fishing'
import { stageAtLeast, STAGES, type StageId } from '../../lib/progression'
import { type RecipeBook, useRecipeBook } from '../../lib/recipes'
import { useToolsData, useToolStage, type ToolsData } from '../../lib/toolsData'

type Tab = 'pocoes' | 'missoes' | 'caixas' | 'pescador'
const TABS: { id: Tab; label: string }[] = [
  { id: 'pocoes', label: 'Peixes de poção' },
  { id: 'missoes', label: 'Missões' },
  { id: 'caixas', label: 'Caixas' },
  { id: 'pescador', label: 'Pescador' },
]
const TAB_KEY = 'terrapedia:fishing-tab'

const pill = 'rounded-full bg-bg/70 px-2 py-0.5 text-xs'

function Check({ why }: { why?: string }) {
  return (
    <span className={`${pill} text-amber-300`} title={why}>
      conferir
    </span>
  )
}

function readTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return TABS.some((t) => t.id === v) ? (v as Tab) : 'pocoes'
  } catch {
    return 'pocoes'
  }
}

function BiomeSelect({ value, onChange, ids }: { value: BiomeId | ''; onChange: (b: BiomeId | '') => void; ids: BiomeId[] }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-muted">
      Bioma:
      <select value={value} onChange={(e) => onChange(e.target.value as BiomeId | '')} className={selectClass}>
        <option value="">Todos</option>
        {ids.map((b) => (
          <option key={b} value={b}>
            {BIOMES[b]}
          </option>
        ))}
      </select>
    </label>
  )
}

function PotionTab({ book, biome }: { book: RecipeBook; biome: BiomeId | '' }) {
  const rows = POTION_FISH.filter((f) => !biome || f.biome === biome)
  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Nenhum peixe de poção neste bioma.</p>
      ) : (
        <ul className={`${cardClass} divide-y divide-line`}>
          {rows.map((f) => (
            <li key={f.fish} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <ItemChip book={book} name={f.fish} />
                <span className={`${pill} text-muted`}>{BIOMES[f.biome]}</span>
                <span className={`${pill} text-muted`}>{f.layers}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-1">
                <span className="text-xs text-muted">Serve para:</span>
                {f.makes.map((m) => (
                  <ItemChip key={m} book={book} name={m} size="sm" />
                ))}
              </div>
              {f.note && <p className="pl-1 text-xs text-muted">{f.note}.</p>}
            </li>
          ))}
        </ul>
      )}
      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Comidas com peixe</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {FOOD_FISH.map((f) => (
            <li key={f.food} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ItemChip book={book} name={f.food} size="sm" />
              <span className="text-muted">← qualquer um:</span>
              {f.fish.map((x) => (
                <ItemChip key={x} book={book} name={x} size="sm" showEn={false} />
              ))}
              <span className="text-xs text-muted">({f.where})</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">O Seafood Dinner usa qualquer peixe de poção da lista acima.</p>
      </section>
    </div>
  )
}

function QuestTab({ book, biome, stage }: { book: RecipeBook; biome: BiomeId | ''; stage: StageId }) {
  const hard = stageAtLeast(stage, 'hardmode')
  const rows = QUEST_FISH.filter((f) => !biome || f.biome === biome)
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Peixes que o Pescador pode pedir. Cada um só sai no bioma e na camada indicados e só enquanto a missão do dia vale.
        {!hard && ' Os marcados “Modo Difícil” ainda não saem no seu mundo.'}
      </p>
      <ul className={`${cardClass} divide-y divide-line`}>
        {rows.map((f) => (
          <li key={f.fish} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0 ${f.hardmode && !hard ? 'opacity-50' : ''}`}>
            <span className="min-w-44">
              <ItemChip book={book} name={f.fish} />
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={`${pill} text-muted`}>{BIOMES[f.biome]}{f.pure ? ' (puro)' : ''}</span>
              <span className={`${pill} text-muted`}>{f.layers}</span>
              {f.hardmode && <span className={`${pill} text-amber-300`}>Modo Difícil</span>}
              {f.note && <span className="text-xs text-muted">{f.note}</span>}
              {f.check && <Check why={f.check} />}
            </span>
          </li>
        ))}
      </ul>
      <details className={cardClass}>
        <summary className="cursor-pointer font-semibold text-gold">Qual bioma vale quando há vários?</summary>
        <p className="mt-2 text-sm text-muted">
          Ordem em que o jogo olha o bioma (do primeiro ao último). “Puro” quer dizer sem outro bioma por perto.
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/90">
          {BIOME_PRIORITY.map((b) => (
            <li key={b.biome}>
              {b.biome}
              {b.note && <span className="text-muted"> — {b.note}</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm font-semibold text-ink">Camadas (valem pela posição da boia, não a sua)</p>
        <ul className="mt-1 space-y-1 text-sm text-ink/90">
          {FISHING_LAYERS.map((l) => (
            <li key={l.layer}>
              <span className="font-medium">{l.layer}:</span> <span className="text-muted">{l.where}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function CrateCard({ book, crate, data, hard }: { book: RecipeBook; crate: Crate; data: ToolsData; hard: boolean }) {
  const entries = (name: string) =>
    Object.entries(data.drops)
      .flatMap(([item, es]) => es.filter((e) => e[0] === name && e[1] != null).map((e) => ({ item, p: e[1] as number })))
      .sort((a, b) => b.p - a.p)
  const pre = entries(crate.pre)
  const hardRows = entries(crate.hard)
  const show = hard ? hardRows : pre
  const missing = CRATES_WITHOUT_DATA.includes(hard ? crate.hard : crate.pre)
  const exclusive = (crate.exclusive ?? []).filter((e) => !e.only || (e.only === 'hard') === hard)
  const extra = hard ? crate.hardExtra : undefined
  const fmt = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 })
  return (
    <li className={`${cardClass} space-y-2`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ItemChip book={book} name={hard ? crate.hard : crate.pre} />
        <span className={`${pill} text-muted`}>{BIOMES[crate.biome]}</span>
        <span className={`${pill} text-muted`}>{crate.rarity}</span>
        <span className={`${pill} text-muted`}>vende por {crate.sell}</span>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {hard ? 'Antes do Modo Difícil:' : 'No Modo Difícil:'}
        <ItemChip book={book} name={hard ? crate.pre : crate.hard} size="sm" showEn={false} />
      </p>
      {exclusive.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs text-muted">Só saem de caixa:</span>
          {exclusive.map((e) => (
            <ItemChip key={e.item} book={book} name={e.item} size="sm" showEn={false} />
          ))}
        </div>
      )}
      {extra && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs text-muted">Também pode dar:</span>
          {extra.map((e) => (
            <ItemChip key={e} book={book} name={e} size="sm" showEn={false} />
          ))}
        </div>
      )}
      {show.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm text-accent">Itens com chance ({show.length})</summary>
          <ul className="mt-1 divide-y divide-line">
            {show.map((e) => (
              <li key={e.item} className="flex items-center justify-between gap-2 py-1.5">
                <ItemChip book={book} name={e.item} size="sm" showEn={false} />
                <span className="text-sm font-semibold tabular-nums text-gold">{fmt.format(e.p)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">Lista parcial da tabela Drops da wiki: confira na página da caixa para o conteúdo completo.</p>
        </details>
      ) : (
        missing && (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Check why="a tabela de drops da wiki não lista itens desta caixa" /> sem itens com chance listados: ver a página da caixa.
          </p>
        )
      )}
    </li>
  )
}

function CratesTab({ book, data, stage, biome }: { book: RecipeBook; data: ToolsData; stage: StageId; biome: BiomeId | '' }) {
  const [mode, setMode] = useState<'auto' | 'pre' | 'hard'>('auto')
  const hard = mode === 'auto' ? stageAtLeast(stage, 'hardmode') : mode === 'hard'
  const rows = CRATES.filter((c) => !biome || c.biome === biome)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Mostrar:</span>
        {(
          [
            ['auto', `Da minha etapa (${stageAtLeast(stage, 'hardmode') ? 'Modo Difícil' : 'antes do Modo Difícil'})`],
            ['pre', 'Antes do Modo Difícil'],
            ['hard', 'Modo Difícil'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={`h-9 rounded-full border px-3 transition ${mode === id ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-panel text-ink/90 hover:border-accent'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="space-y-3">
        {rows.map((c) => (
          <CrateCard key={c.pre} book={book} crate={c} data={data} hard={hard} />
        ))}
      </ul>
      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Como funcionam as caixas</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink/90">
          {CRATE_FACTS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function AnglerTab({ book, stage }: { book: RecipeBook; stage: StageId }) {
  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Como funcionam as missões</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink/90">
          {ANGLER_FACTS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Recompensas garantidas</h3>
        <ul className="mt-2 divide-y divide-line">
          {ANGLER_FIXED.map((r) => (
            <li key={r.quest} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-24 shrink-0 text-sm text-muted">{r.quest}ª missão</span>
              <ItemChip book={book} name={r.item} size="sm" />
            </li>
          ))}
        </ul>
      </section>

      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Recompensas aleatórias</h3>
        <p className="mt-1 text-xs text-muted">Chances base da wiki. Na prática ficam menores conforme você completa missões (e sobem se o Pescador está feliz).</p>
        <ul className="mt-2 divide-y divide-line">
          {ANGLER_RANDOM.map((r) => {
            const locked = r.minStage && !stageAtLeast(stage, r.minStage)
            return (
              <li key={`${r.item}${r.chance}`} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${locked ? 'opacity-50' : ''}`}>
                <span className="min-w-44">
                  <ItemChip book={book} name={r.item} size="sm" />
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-gold">{r.chance}</span>
                  {r.fromQuest && <span className={`${pill} text-muted`}>a partir da {r.fromQuest}ª missão</span>}
                  {r.minStage && <span className={`${pill} text-amber-300`}>{STAGES.find((s) => s.id === r.minStage)?.label}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={cardClass}>
        <h3 className="font-display font-bold text-gold">Acessórios de pesca</h3>
        <p className="mt-1 text-xs text-muted">Um por vez, entre os que você ainda não tem.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ANGLER_ACCESSORIES.map((a) => (
            <ItemChip key={a} book={book} name={a} size="sm" />
          ))}
        </div>
        <h4 className="mt-3 text-sm font-semibold text-ink">Se nada mais saiu: 2 a 5 poções</h4>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {ANGLER_POTIONS.map((a) => (
            <ItemChip key={a} book={book} name={a} size="sm" showEn={false} />
          ))}
        </div>
      </section>

      <details className={cardClass}>
        <summary className="cursor-pointer font-semibold text-gold">Decorações ({ANGLER_DECORATIONS.length}, uma ao acaso)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ANGLER_DECORATIONS.map((a) => (
            <ItemChip key={a} book={book} name={a} size="sm" />
          ))}
        </div>
      </details>
    </div>
  )
}

/** `/ferramentas/pescaria`: peixes de poção e de missão por bioma e camada, caixas (antes/depois do Modo Difícil) e recompensas do Pescador. */
export default function FishingPage() {
  const book = useRecipeBook()
  const data = useToolsData()
  const { stage } = useToolStage()
  const [tab, setTabState] = useState<Tab>(readTab)
  const [biome, setBiome] = useState<BiomeId | ''>('')

  useEffect(() => {
    document.title = 'Pescaria · Terrapedia'
  }, [])

  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // sem localStorage: vale até fechar a página
    }
  }
  const biomeIds = useMemo<BiomeId[]>(() => {
    const used = new Set<BiomeId>()
    const list = tab === 'pocoes' ? POTION_FISH : tab === 'missoes' ? QUEST_FISH : CRATES
    for (const x of list) used.add(x.biome)
    used.delete('any')
    return (Object.keys(BIOMES) as BiomeId[]).filter((b) => used.has(b))
  }, [tab])

  const header = <ToolHeader title="Pescaria" subtitle="Peixes de poção e de missão por bioma, caixas e recompensas do Pescador." />
  if (!book || !data)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        {header}
        <Loading />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {header}
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <div role="tablist" className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-10 rounded-full border px-4 text-sm transition ${tab === t.id ? 'border-gold bg-gold/10 font-semibold text-gold' : 'border-line bg-panel text-ink/90 hover:border-accent'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <StagePicker />
            {tab !== 'pescador' && <BiomeSelect value={biome} onChange={setBiome} ids={biomeIds} />}
          </div>
        </section>

        {tab === 'pocoes' && <PotionTab book={book} biome={biome} />}
        {tab === 'missoes' && <QuestTab book={book} biome={biome} stage={stage} />}
        {tab === 'caixas' && <CratesTab book={book} data={data} stage={stage} biome={biome} />}
        {tab === 'pescador' && <AnglerTab book={book} stage={stage} />}

        <p className="text-xs text-muted">
          Fonte: páginas “Fishing”, “Fishing catches”, “Potion fish”, “Quest fish”, “Crate” e “Angler” da Terraria Wiki (Terraria 1.4.5, lidas
          em {FISHING_SOURCE_DATE}), resumidas com nossas palavras; chances das caixas da tabela Drops ({data.source.date}). Itens
          marcados “conferir” não foram confirmados ({FISHING_CHECK_COUNT}).
        </p>
      </div>
    </div>
  )
}
