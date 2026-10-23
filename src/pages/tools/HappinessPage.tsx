import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import ItemChip from '../../components/ItemChip'
import { articlePath } from '../../components/SearchBar'
import { cardClass, Loading, selectClass, StagePicker, ToolHeader } from '../../components/ToolsUI'
import { XIcon } from '../../components/icons'
import { useNpcHouses } from '../../lib/npcHouses'
import {
  BIOMES,
  biome,
  housePylon,
  isHardmode,
  LEVEL_LABEL,
  moodLabel,
  npcIcon,
  npcMood,
  NPCS,
  npcUnlocked,
  suggestHouses,
  useNpcData,
  type BiomeId,
  type House,
  type MoodReason,
  type NpcPrefs,
} from '../../lib/npcs'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useDefeated, useToolStage } from '../../lib/toolsData'

const pct = (factor: number) => `${factor > 1 ? '+' : '−'}${Math.round(Math.abs(factor - 1) * 100)}%`

/** NPC clicável: cabeça do mapa + nome PT (+ EN). */
export function NpcName({ book, name, showEn = true }: { book: RecipeBook; name: string; showEn?: boolean }) {
  const pt = ptName(book, name)
  return (
    <Link to={articlePath(name)} className="group inline-flex min-w-0 items-center gap-2">
      <img src={npcIcon(name)} alt="" loading="lazy" className="pixelated h-6 w-6 shrink-0 object-contain" />
      <span className="min-w-0 leading-tight">
        <span className="font-medium text-accent group-hover:underline">{pt}</span>
        {showEn && pt !== name && <span className="block truncate text-xs text-muted">{name}</span>}
      </span>
    </Link>
  )
}

function reasonText(r: MoodReason, house: House, book: RecipeBook) {
  if (r.kind === 'solitude') return 'pouca gente por perto'
  if (r.kind === 'crowded') return 'casa cheia demais (mais de 3 vizinhos)'
  if (r.kind === 'biome') {
    const verb = { love: 'ama o', like: 'gosta do', dislike: 'não gosta do', hate: 'odeia o' }[r.level!]
    return `${verb} bioma (${biome(house.biome).label})`
  }
  return `${LEVEL_LABEL[r.level!]} ${ptName(book, r.npc!)}`
}

function HouseCard({
  house,
  index,
  book,
  prefs,
  free,
  hardmode,
  onChange,
  onRemove,
}: {
  house: House
  index: number
  book: RecipeBook
  prefs: Record<string, NpcPrefs>
  free: string[]
  hardmode: boolean
  onChange: (h: House) => void
  onRemove: () => void
}) {
  const pylon = housePylon(house)
  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <span className="font-display text-lg font-bold text-gold">Casa {index + 1}</span>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Bioma da casa {index + 1}</span>
          <select
            value={house.biome}
            onChange={(e) => onChange({ ...house, biome: e.target.value as BiomeId })}
            className={`${selectClass} w-full`}
          >
            {BIOMES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onRemove} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-ink" aria-label={`Apagar casa ${index + 1}`}>
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {house.npcs.length === 0 && <p className="text-sm text-muted">Casa vazia. Escolha um NPC abaixo.</p>}
      <ul className="space-y-3">
        {house.npcs.map((name) => {
          const mood = npcMood(name, house, prefs)
          const { label, tone } = moodLabel(mood.factor)
          return (
            <li key={name} className="rounded-lg bg-bg/50 p-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <NpcName book={book} name={name} />
                </div>
                <div className="text-right leading-tight">
                  <span className={`block font-semibold ${tone}`}>{Math.round(mood.factor * 100)}%</span>
                  <span className={`text-xs ${tone}`}>{label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...house, npcs: house.npcs.filter((n) => n !== name) })}
                  className="rounded p-1 text-muted hover:text-ink"
                  aria-label={`Tirar ${ptName(book, name)} da casa`}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              {mood.reasons.length > 0 && (
                <ul className="mt-1 ml-8 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {mood.reasons.map((r, i) => (
                    <li key={i} className={r.factor < 1 ? 'text-green-400' : 'text-red-400'}>
                      {pct(r.factor)} {reasonText(r, house, book)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {free.length > 0 && (
        <label>
          <span className="sr-only">Pôr um NPC na casa {index + 1}</span>
          <select
            value=""
            onChange={(e) => e.target.value && onChange({ ...house, npcs: [...house.npcs, e.target.value] })}
            className={`${selectClass} w-full`}
          >
            <option value="">+ Pôr um NPC nesta casa</option>
            {free.map((n) => (
              <option key={n} value={n}>
                {ptName(book, n)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-auto border-t border-line pt-2 text-sm">
        {pylon ? (
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-muted">Libera:</span>
            <ItemChip book={book} name={pylon} size="sm" showEn={false} />
            {biome(house.biome).hardmode && !hardmode && <span className="text-xs text-amber-300">(o Sagrado só aparece no Modo Difícil)</span>}
          </div>
        ) : (
          <p className="text-muted">Sem Pilone: precisa de pelo menos 2 NPCs e um deles vendedor.</p>
        )}
      </div>
    </section>
  )
}

/** `/ferramentas/felicidade`: casas com NPCs e bioma; felicidade, preço e Pilones. */
export default function HappinessPage() {
  const book = useRecipeBook()
  const npcData = useNpcData()
  const { stage } = useToolStage()
  const defeated = useDefeated()
  const { houses, save, worldId } = useNpcHouses()
  const hardmode = isHardmode(stage)

  useEffect(() => {
    document.title = 'Felicidade dos NPCs · Terrapedia'
  }, [])

  const residents = useMemo(() => NPCS.filter((n) => !n.visitor && npcData?.prefs[n.name]), [npcData])
  const unlocked = residents.filter((n) => npcUnlocked(n, stage, defeated)).map((n) => n.name)

  if (!book || !npcData || !houses)
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <ToolHeader title="Felicidade dos NPCs" subtitle="Monte as casas, veja quem fica feliz e quais Pilones elas liberam." />
        <Loading />
      </div>
    )

  const placed = new Set(houses.flatMap((h) => h.npcs))
  // NPCs sem casa: os liberados na etapa primeiro
  const free = residents
    .map((n) => n.name)
    .filter((n) => !placed.has(n))
    .sort((a, b) => Number(unlocked.includes(b)) - Number(unlocked.includes(a)))
  const pylons = [...new Set(houses.map(housePylon).filter(Boolean))] as string[]

  const update = (i: number, h: House) => save(houses.map((x, k) => (k === i ? h : x)))
  const addHouse = () => save([...houses, { id: Date.now().toString(36), biome: 'forest', npcs: [] }])
  const suggest = () => {
    if (houses.some((h) => h.npcs.length) && !confirm('Trocar as casas atuais pela sugestão?')) return
    save(suggestHouses(unlocked, npcData.prefs, hardmode))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ToolHeader title="Felicidade dos NPCs" subtitle="Monte as casas, veja quem fica feliz e quais Pilones elas liberam." />
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <StagePicker />
          <p className="text-sm text-muted">
            NPCs da mesma casa moram a até 25 blocos um do outro; a conta considera as casas a mais de 120 blocos entre si. O
            preço mostrado é o quanto o NPC cobra (100% = normal; vai de 75% a 150%). O Pilone sai na loja de um vendedor da
            casa quando há mais um NPC perto.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addHouse} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-accent">
              + Nova casa
            </button>
            <button
              type="button"
              onClick={suggest}
              disabled={unlocked.length === 0}
              className="rounded-lg bg-gold/15 px-3 py-2 text-sm font-semibold text-gold ring-1 ring-gold/40 hover:bg-gold/25 disabled:opacity-50"
            >
              Sugerir arranjo
            </button>
            {houses.length > 0 && (
              <button
                type="button"
                onClick={() => confirm('Apagar todas as casas?') && save([])}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:text-ink"
              >
                Limpar tudo
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            "Sugerir arranjo" usa os {unlocked.length} NPCs que já podem morar no mundo nesta etapa
            {defeated ? ' (confere os chefes e eventos opcionais do mundo)' : ''}. {worldId ? 'Salvo no mundo ativo: todos os membros veem.' : 'Salvo neste aparelho.'}
          </p>
        </section>

        {houses.length === 0 ? (
          <p className="py-6 text-center text-muted">Nenhuma casa ainda. Crie uma ou peça uma sugestão.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {houses.map((h, i) => (
              <HouseCard
                key={h.id}
                house={h}
                index={i}
                book={book}
                prefs={npcData.prefs}
                free={free}
                hardmode={hardmode}
                onChange={(next) => update(i, next)}
                onRemove={() => save(houses.filter((_, k) => k !== i))}
              />
            ))}
          </div>
        )}

        {houses.length > 0 && (
          <section className={cardClass}>
            <h2 className="mb-2 font-display text-lg font-bold text-ink">Resumo</h2>
            <p className="text-sm text-ink">
              {pylons.length} Pilone{pylons.length === 1 ? '' : 's'} liberado{pylons.length === 1 ? '' : 's'}
              {pylons.length > 0 && ': '}
              {pylons.map((p, i) => (
                <span key={p}>
                  {i > 0 && ', '}
                  {ptName(book, p)}
                </span>
              ))}
              .
            </p>
            {free.some((n) => unlocked.includes(n)) && (
              <p className="mt-2 text-sm text-muted">
                Ainda sem casa:{' '}
                {free
                  .filter((n) => unlocked.includes(n))
                  .map((n) => ptName(book, n))
                  .join(', ')}
                .
              </p>
            )}
          </section>
        )}

        <p className="text-sm">
          <Link to={articlePath('NPCs')} className="text-accent hover:underline">
            Página dos NPCs na wiki
          </Link>
        </p>
      </div>
    </div>
  )
}
