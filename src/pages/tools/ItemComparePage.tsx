import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { XIcon } from '../../components/icons'
import ItemChip, { Sprite } from '../../components/ItemChip'
import { articlePath } from '../../components/SearchBar'
import { cardClass, ItemPicker, Loading, ToolHeader } from '../../components/ToolsUI'
import { CLASS_OF } from '../../lib/bestModifier'
import { CATEGORY_PT, describeEquip, fetchTooltips, KIND_PT, rarityLabel, SLOT_PT, STAT_ROWS } from '../../lib/itemCompare'
import { ptName, stationParts, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useToolsData, type ToolItem, type ToolsData } from '../../lib/toolsData'
import { CLASS_LABELS } from '../../lib/world'

const MAX = 3
const EXAMPLES: [string, string][] = [
  ['Night\'s Edge', 'Excalibur'],
  ['Minishark', 'Phoenix Blaster'],
  ['Hermes Boots', 'Flurry Boots'],
  ['Imp Staff', 'Spider Staff'],
]

/** `/ferramentas/comparar?itens=A|B|C`: 2 ou 3 itens lado a lado. */
export default function ItemComparePage() {
  const book = useRecipeBook()
  const data = useToolsData()
  const [params, setParams] = useSearchParams()
  const names = useMemo(() => (params.get('itens') ?? '').split('|').filter(Boolean).slice(0, MAX), [params])

  useEffect(() => {
    document.title = 'Comparador de itens · Terrapedia'
  }, [])

  const setNames = (list: string[]) => setParams(list.length ? { itens: list.join('|') } : {}, { replace: true })
  const allNames = useMemo(() => (data ? [...data.items.keys()] : []), [data])
  const items = data ? names.map((n) => data.items.get(n)).filter((it): it is ToolItem => !!it) : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ToolHeader title="Comparador de itens" subtitle="Escolha 2 ou 3 armas, acessórios ou peças de armadura para ver lado a lado." />
      {!book || !data ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          {items.length < MAX && (
            <ItemPicker
              book={book}
              names={allNames.filter((n) => !names.includes(n))}
              onPick={(n) => setNames([...names, n])}
              placeholder={items.length ? 'Adicionar outro item' : 'Primeiro item (português ou inglês)'}
            />
          )}
          {items.length === 0 && (
            <div className="text-sm text-muted">
              <p className="mb-2">Exemplos:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((pair) => (
                  <button
                    key={pair.join()}
                    type="button"
                    onClick={() => setNames(pair)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-ink hover:border-accent"
                  >
                    <Sprite book={book} name={pair[0]} size="sm" />
                    {ptName(book, pair[0])} × {ptName(book, pair[1])}
                    <Sprite book={book} name={pair[1]} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {items.length > 0 && <Comparison book={book} data={data} items={items} onRemove={(n) => setNames(names.filter((x) => x !== n))} />}
          <p className="text-xs text-muted">
            Números das tabelas Cargo da Terraria Wiki (CC BY-NC-SA 3.0), baixados em {data.source.date}.
          </p>
        </div>
      )}
    </div>
  )
}

function Comparison({ book, data, items, onRemove }: { book: RecipeBook; data: ToolsData; items: ToolItem[]; onRemove: (name: string) => void }) {
  const [tooltips, setTooltips] = useState<Record<string, string> | null>(null)
  const key = items.map((i) => i.name).join('|')
  useEffect(() => {
    let alive = true
    setTooltips(null)
    fetchTooltips(key.split('|'))
      .then((t) => alive && setTooltips(t))
      .catch(() => alive && setTooltips({}))
    return () => {
      alive = false
    }
  }, [key])

  const cols = items.length === 1 ? 'grid-cols-1' : items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-t border-line/60 py-2.5">
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div className={`grid ${cols} gap-3 break-words`}>{children}</div>
    </div>
  )

  return (
    <section className={`${cardClass} px-3 sm:px-4`}>
      <div className={`grid ${cols} gap-3 pb-3`}>
        {items.map((it) => (
          <div key={it.name} className="relative min-w-0 pr-5">
            <Link to={articlePath(it.name)} className="group flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
              <Sprite book={book} name={it.name} size="lg" />
              <span className="min-w-0 leading-tight break-words">
                <span className="font-medium text-accent group-hover:underline">{ptName(book, it.name)}</span>
                {ptName(book, it.name) !== it.name && <span className="block text-xs text-muted">{it.name}</span>}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => onRemove(it.name)}
              className="absolute top-0 right-0 rounded p-1 text-muted hover:bg-bg hover:text-ink"
              aria-label={`Tirar ${ptName(book, it.name)}`}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {items.length === 1 && <p className="pb-2 text-sm text-muted">Adicione mais um item para comparar.</p>}

      <Row label="Tipo">
        {items.map((it) => (
          <p key={it.name} className="min-w-0 text-sm">
            {it.cat && CATEGORY_PT[it.cat] ? CATEGORY_PT[it.cat] : KIND_PT[it.kind]}
            {it.slot && ` (${SLOT_PT[it.slot]})`}
            {(it.class || it.cat === 'whips') && (
              <span className="block text-xs text-accent">{CLASS_LABELS[it.cat === 'whips' ? 'summoner' : CLASS_OF[it.class!]]}</span>
            )}
            {it.hardmode && <span className="block text-xs text-muted">Modo Difícil</span>}
          </p>
        ))}
      </Row>

      {STAT_ROWS.map((row) => {
        const values = items.map((it) => row.value(it))
        if (values.every((v) => v === null || v === undefined)) return null
        const nums = values.filter((v): v is number => typeof v === 'number')
        const best = items.length > 1 && nums.length > 1 ? (row.better === 1 ? Math.max(...nums) : Math.min(...nums)) : null
        const tie = best !== null && nums.every((v) => v === best)
        return (
          <Row key={row.label} label={row.label}>
            {items.map((it, i) => {
              const v = values[i]
              return (
                <p key={it.name} className={`min-w-0 text-sm ${v === best && !tie ? 'font-bold text-gold' : 'text-ink'}`}>
                  {typeof v === 'number' ? row.text(v, it) : <span className="text-muted">—</span>}
                </p>
              )
            })}
          </Row>
        )
      })}

      <Row label="Raridade">
        {items.map((it) => (
          <p key={it.name} className="text-sm">
            {it.rare !== null ? rarityLabel(it.rare) : '—'}
          </p>
        ))}
      </Row>

      <Row label="Efeitos">
        {items.map((it) => (
          <Effects key={it.name} book={book} data={data} item={it} tooltip={tooltips?.[it.name]} loading={tooltips === null} />
        ))}
      </Row>

      <Row label="Como conseguir">
        {items.map((it) => (
          <HowToGet key={it.name} book={book} data={data} item={it} />
        ))}
      </Row>
    </section>
  )
}

function Effects({ book, data, item, tooltip, loading }: { book: RecipeBook; data: ToolsData; item: ToolItem; tooltip?: string; loading: boolean }) {
  const lines = describeEquip(data.equip[item.name] ?? {})
  return (
    <div className="min-w-0 space-y-1 text-sm">
      {lines.length > 0 && (
        <ul className="space-y-0.5">
          {lines.map((l) => (
            <li key={l} className="text-green-400">
              {l}
            </li>
          ))}
        </ul>
      )}
      {item.debuffs.length > 0 && (
        <p>
          <span className="text-muted">Causa: </span>
          {item.debuffs.map((d) => ptName(book, d)).join(', ')}
        </p>
      )}
      {item.buffs.length > 0 && item.kind !== 'weapon' && (
        <p>
          <span className="text-muted">Dá: </span>
          {item.buffs.map((b) => ptName(book, b)).join(', ')}
        </p>
      )}
      {tooltip ? (
        <p className="text-xs whitespace-pre-line text-muted italic" title="Texto do jogo, em inglês (da wiki)">
          {tooltip}
        </p>
      ) : (
        loading && <p className="text-xs text-muted">…</p>
      )}
      {!lines.length && !item.debuffs.length && !tooltip && !loading && <p className="text-muted">—</p>}
    </div>
  )
}

function HowToGet({ book, data, item }: { book: RecipeBook; data: ToolsData; item: ToolItem }) {
  const recipes = (book.byResult.get(item.name) ?? []).filter((r) => r.station !== 'Shimmer').slice(0, 2)
  const drops = data.drops[item.name] ?? []
  const vendors = data.vendors[item.name] ?? []
  const nothing = !recipes.length && !drops.length && !vendors.length
  return (
    <div className="min-w-0 space-y-2 text-sm">
      {recipes.map((r) => (
        <div key={r.id}>
          <p className="text-xs text-muted">
            Criado em {stationParts(r.station).map((opts) => opts.map((s) => ptName(book, s)).join(' ou ')).join(' + ')}:
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {r.ingredients.map((ing) => (
              <ItemChip key={ing.name} book={book} name={ing.name} amount={ing.amount} size="sm" showEn={false} />
            ))}
          </div>
        </div>
      ))}
      {recipes.length > 0 && (
        <Link to={`/arvore/${encodeURIComponent(item.name)}`} className="block text-xs text-accent hover:underline">
          Ver árvore de crafting
        </Link>
      )}
      {drops.length > 0 && (
        <div>
          <p className="text-xs text-muted">Cai de:</p>
          <ul>
            {drops.slice(0, 3).map(([source, rate, mode]) => (
              <li key={source}>
                {ptName(book, source)}
                {rate !== null && <span className="text-muted"> ({rate}%)</span>}
                {mode && <span className="ml-1 text-xs text-gold">{mode === 'expert' ? 'Expert' : 'Mestre'}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {vendors.length > 0 && (
        <p>
          <span className="text-xs text-muted">Vendido por: </span>
          {vendors.map((v) => ptName(book, v)).join(', ')}
        </p>
      )}
      {nothing && <p className="text-muted">Veja na página do item.</p>}
    </div>
  )
}
