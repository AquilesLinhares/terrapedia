import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RichText } from '../../components/GuideView'
import ItemChip, { Sprite } from '../../components/ItemChip'
import NpcName from '../../components/NpcName'
import { articlePath } from '../../components/SearchBar'
import { cardClass, ItemPicker, Loading, StagePicker, ToolHeader } from '../../components/ToolsUI'
import { conditionUnlocked, npcIcon, npcInfo, NPCS, npcUnlocked, useNpcData, type ShopItem } from '../../lib/npcs'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useDefeated, useToolStage } from '../../lib/toolsData'

const WIKI_IMG = 'https://terraria.wiki.gg/images/'
const COINS = [
  { value: 1_000_000, file: 'Platinum_Coin.png', label: 'platina' },
  { value: 10_000, file: 'Gold_Coin.png', label: 'ouro' },
  { value: 100, file: 'Silver_Coin.png', label: 'prata' },
  { value: 1, file: 'Copper_Coin.png', label: 'cobre' },
]

/** Preço com as moedas do jogo (ou Medalhas do Defensor). */
function Price({ price }: { price: ShopItem['price'] }) {
  if (!price) return <span className="text-muted">—</span>
  if ('medals' in price)
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap" title={`${price.medals} Medalhas do Defensor`}>
        {price.medals}
        <img src={`${WIKI_IMG}Defender_Medal.png`} alt="Medalhas do Defensor" className="pixelated h-4 w-auto" />
      </span>
    )
  let left = price.copper
  const parts = COINS.map((c) => {
    const n = Math.floor(left / c.value)
    left -= n * c.value
    return { ...c, n }
  }).filter((c) => c.n > 0)
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-1.5 whitespace-nowrap">
      {parts.map((c) => (
        <span key={c.label} className="inline-flex items-center gap-0.5" title={`${c.n} de ${c.label}`}>
          {c.n}
          <img src={`${WIKI_IMG}${c.file}`} alt={c.label} className="pixelated h-3.5 w-auto" />
        </span>
      ))}
    </span>
  )
}

const MOONS = ['', 'cheia', 'minguante gibosa', 'quarto minguante', 'minguante', 'nova', 'crescente', 'quarto crescente', 'crescente gibosa']
const orList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ou ${xs[xs.length - 1]}`)

/** Texto PT da condição: troca {lua:1,2} pelas fases e {pilone} pela explicação. */
function conditionText(pt: string) {
  return pt
    .replace(/^\{lua:([\d,]+)\}/, (_, n: string) => `Na lua ${orList(n.split(',').map((i) => MOONS[+i]))}`)
    .replace(/\{lua:([\d,]+)\}/g, (_, n: string) => `lua ${orList(n.split(',').map((i) => MOONS[+i]))}`)
    .replace('{pilone}', 'O Pilone do bioma onde você está, com outro NPC morando perto (fora da Corrupção e do Carmesim)')
}

/** Item da loja: "Any Pylon" vira um Pilone genérico. */
function ShopItemName({ book, item }: { book: RecipeBook; item: string }) {
  if (item !== 'Any Pylon') return <ItemChip book={book} name={item} />
  return (
    <Link to={articlePath('Pylons')} className="group inline-flex min-w-0 items-center gap-2">
      <Sprite book={book} name="Forest Pylon" />
      <span className="leading-tight">
        <span className="font-medium text-accent group-hover:underline">Pilone (do bioma)</span>
        <span className="block text-xs text-muted">Pylons</span>
      </span>
    </Link>
  )
}

function ShopRow({ book, row, locked, npc }: { book: RecipeBook; row: ShopItem; locked: boolean; npc?: string }) {
  return (
    <li className={`flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-3 ${locked ? 'opacity-60' : ''}`}>
      <div className="min-w-0 sm:w-64 sm:shrink-0">{npc ? <NpcName book={book} name={npc} /> : <ShopItemName book={book} item={row.item} />}</div>
      <div className="min-w-0 flex-1 text-sm text-muted">
        {row.cond ? <RichText text={conditionText(row.cond.pt)} book={book} /> : 'Sempre'}
        {locked && <span className="ml-2 rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300">ainda não no seu mundo</span>}
      </div>
      <div className="text-sm font-semibold text-ink sm:w-32 sm:text-right">
        <Price price={row.price} />
      </div>
    </li>
  )
}

/** `/ferramentas/vendedores?npc=...&item=...`: lojas dos NPCs, como cada um chega e "quem vende tal item?". */
export default function VendorsPage() {
  const book = useRecipeBook()
  const npcData = useNpcData()
  const { stage } = useToolStage()
  const defeated = useDefeated()
  const [params, setParams] = useSearchParams()
  const [onlyUnlocked, setOnlyUnlocked] = useState(false)

  useEffect(() => {
    document.title = 'Vendedores · Terrapedia'
  }, [])

  const vendors = NPCS.filter((n) => n.vendor && npcData?.shops[n.name])
  const npc = vendors.find((n) => n.name === params.get('npc')) ?? vendors[0]
  const item = params.get('item')

  // Item → [NPC, linha da loja]
  const sellers = useMemo(() => {
    const map = new Map<string, [string, ShopItem][]>()
    for (const [name, rows] of Object.entries(npcData?.shops ?? {}))
      for (const row of rows) if (row.item !== 'Any Pylon') map.set(row.item, [...(map.get(row.item) ?? []), [name, row]])
    return map
  }, [npcData])
  const soldNames = useMemo(() => [...sellers.keys()], [sellers])

  const set = (key: 'npc' | 'item', value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  if (!book || !npcData || !npc)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <ToolHeader title="Vendedores" subtitle="O que cada NPC vende, quando e por quanto, e como ele chega." />
        <Loading />
      </div>
    )

  const locked = (row: ShopItem, seller: string) =>
    !npcUnlocked(npcInfo(seller)!, stage, defeated) || !conditionUnlocked(row.cond, stage, defeated)
  const rows = npcData.shops[npc.name].filter((r) => !onlyUnlocked || !locked(r, npc.name))
  const itemSellers = item ? (sellers.get(item) ?? []) : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader title="Vendedores" subtitle="O que cada NPC vende, quando e por quanto, e como ele chega." />
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <h2 className="font-display text-lg font-bold text-ink">Quem vende...?</h2>
          <ItemPicker book={book} names={soldNames} onPick={(n) => set('item', n)} placeholder="Buscar item vendido (português ou inglês)" />
          {item && (
            <div className="rounded-lg bg-bg/50 p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <ItemChip book={book} name={item} />
                </div>
                <button type="button" onClick={() => set('item', null)} className="text-sm text-muted hover:text-ink">
                  limpar
                </button>
              </div>
              {itemSellers.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Nenhum NPC vende este item.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {itemSellers.map(([seller, row], i) => (
                    <ShopRow key={i} book={book} row={row} npc={seller} locked={locked(row, seller)} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className={`${cardClass} space-y-3`}>
          <StagePicker />
          <ul className="flex flex-wrap gap-1.5" aria-label="Escolha o NPC">
            {vendors.map((n) => (
              <li key={n.name}>
                <button
                  type="button"
                  onClick={() => set('npc', n.name)}
                  title={ptName(book, n.name)}
                  aria-pressed={n.name === npc.name}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                    n.name === npc.name ? 'border-gold bg-gold/15' : 'border-line hover:border-accent'
                  } ${npcUnlocked(n, stage, defeated) ? '' : 'opacity-40'}`}
                >
                  <img src={npcIcon(n.name)} alt={ptName(book, n.name)} className="pixelated max-h-7 max-w-7" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <NpcName book={book} name={npc.name} size="lg" />
          <p className="mt-2 text-ink">
            <span className="font-semibold">Como chega: </span>
            <RichText text={npc.arrives} book={book} />
            {!npcUnlocked(npc, stage, defeated) && <span className="ml-2 text-sm text-amber-300">(ainda não nesta etapa)</span>}
          </p>
          {!npc.visitor && (
            <p className="mt-1 text-sm">
              <Link to="/ferramentas/felicidade" className="text-accent hover:underline">
                Onde morar para vender mais barato (Felicidade dos NPCs)
              </Link>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink">Loja ({rows.length})</h2>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={onlyUnlocked} onChange={(e) => setOnlyUnlocked(e.target.checked)} className="h-4 w-4 accent-gold" />
              Só o que já está liberado
            </label>
          </div>
          <p className="text-xs text-muted">
            Preço normal (sem a felicidade). "Liberado" confere a etapa e os chefes do mundo; noite, bioma e lua você confere no
            jogo.
          </p>
          <ul className="mt-1 divide-y divide-line">
            {rows.map((row, i) => (
              <ShopRow key={i} book={book} row={row} locked={locked(row, npc.name)} />
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted">
          Dados das páginas dos NPCs na wiki (lidas em {npcData.source.date}).{' '}
          <Link to={articlePath(npc.name)} className="text-accent hover:underline">
            Página de {ptName(book, npc.name)}
          </Link>
        </p>
      </div>
    </div>
  )
}
