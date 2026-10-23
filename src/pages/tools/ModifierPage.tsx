import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import ItemChip, { Sprite } from '../../components/ItemChip'
import { cardClass, ItemPicker, Loading, ToolHeader } from '../../components/ToolsUI'
import {
  ACCESSORY_ADVICE,
  accessoryClass,
  applyModifier,
  canReforge,
  CLASS_OF,
  describeModifier,
  modifierLabel,
  possibleModifiers,
  SAFE_PICK,
  weaponAdvice,
  type Pick,
} from '../../lib/bestModifier'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useToolClass, useToolsData, type ToolItem, type ToolsData } from '../../lib/toolsData'
import { CLASS_LABELS, type PlayerClass } from '../../lib/world'

const EXAMPLES = ['Night\'s Edge', 'Minishark', 'Water Bolt', 'Imp Staff', 'Leather Whip', 'Hermes Boots']

/** `/ferramentas/modificador?item=...`: melhor modificador para reforjar uma arma ou acessório. */
export default function ModifierPage() {
  const book = useRecipeBook()
  const data = useToolsData()
  const [params, setParams] = useSearchParams()
  const name = params.get('item')

  useEffect(() => {
    document.title = 'Melhor modificador · Terrapedia'
  }, [])

  const names = useMemo(
    () => (data ? [...data.items.values()].filter((it) => canReforge(it) && it.kind !== 'armor').map((it) => it.name) : []),
    [data],
  )
  const found = name ? data?.items.get(name) : undefined
  const item = found && canReforge(found) ? found : undefined
  const pick = (n: string) => setParams({ item: n })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader
        title="Melhor modificador"
        subtitle="Escolha uma arma ou acessório: veja qual modificador buscar no Inventor Goblin (Reforjar) e por quê."
      />
      {!book || !data ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          <ItemPicker book={book} names={names} onPick={pick} placeholder="Arma ou acessório (português ou inglês)" />
          {!item ? (
            <div className="text-sm text-muted">
              {name && <p className="mb-2 text-gold">Esse item não recebe modificador.</p>}
              <p className="mb-2">Exemplos:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pick(n)}
                    className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-ink hover:border-accent"
                  >
                    <Sprite book={book} name={n} size="sm" />
                    {ptName(book, n)}
                  </button>
                ))}
              </div>
            </div>
          ) : item.kind === 'accessory' ? (
            <AccessoryResult book={book} data={data} item={item} />
          ) : (
            <WeaponResult book={book} data={data} item={item} />
          )}
          <p className="text-xs text-muted">
            Fonte: página{' '}
            <a href="https://terraria.wiki.gg/wiki/Modifiers" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Modifiers
            </a>{' '}
            da Terraria Wiki (CC BY-NC-SA 3.0), revisão {data.source.modifiersRevid}. Reforjar sorteia entre todos os modificadores
            possíveis com a mesma chance.
          </p>
        </div>
      )}
    </div>
  )
}

function ModName({ data, name, big }: { data: ToolsData; name: string; big?: boolean }) {
  const { pt, en } = modifierLabel(data, name)
  return (
    <span className={big ? 'block font-display text-2xl font-bold text-gold' : 'font-semibold text-ink'}>
      {pt}
      {pt !== en && <span className={`ml-1.5 font-sans font-normal text-muted ${big ? 'text-base' : 'text-xs'}`}>({en})</span>}
    </span>
  )
}

function Effects({ data, name }: { data: ToolsData; name: string }) {
  const acc = data.modCats.accessory.find((a) => a.name === name.replace(/\d$/, ''))
  if (acc) return <span className="text-sm text-green-400">{acc.value} {ACC_EFFECT[acc.effect] ?? acc.effect}</span>
  const m = data.modifiers[name]
  if (!m) return null
  return (
    <span className="flex flex-wrap gap-x-2 text-sm">
      {describeModifier(m).map((e) => (
        <span key={e.text} className={e.good ? 'text-green-400' : 'text-red-400'}>
          {e.text}
        </span>
      ))}
    </span>
  )
}

const ACC_EFFECT: Record<string, string> = {
  Defense: 'de defesa',
  'Critical strike chance': 'de chance de crítico',
  Damage: 'de dano',
  'Movement speed': 'de velocidade de movimento',
  'Melee speed': 'de velocidade corpo a corpo',
  Mana: 'de mana máxima',
}

function ItemHeader({ book, item, children }: { book: RecipeBook; item: ToolItem; children?: React.ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-wrap items-center gap-x-4 gap-y-2`}>
      <ItemChip book={book} name={item.name} size="lg" />
      <span className="text-sm text-muted">{children}</span>
    </div>
  )
}

function WeaponResult({ book, data, item }: { book: RecipeBook; data: ToolsData; item: ToolItem }) {
  const advice = weaponAdvice(data, item)
  const possible = possibleModifiers(data, item)
  const cls = item.cat === 'whips' ? 'summoner' : item.class ? CLASS_OF[item.class] : null
  const mod = data.modifiers[advice.best.name]
  const changes = mod ? applyModifier(item, mod) : []

  return (
    <>
      <ItemHeader book={book} item={item}>
        {cls && <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">{CLASS_LABELS[cls]}</span>}
        {advice.kindNote}
      </ItemHeader>

      <section className={`${cardClass} space-y-3 border-gold/40`}>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Melhor modificador</p>
        <ModName data={data} name={advice.best.name} big />
        <Effects data={data} name={advice.best.name} />
        <p className="text-ink">{advice.best.why}</p>
        {changes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {changes.map((c) => (
              <span key={c.label} className="rounded-lg bg-bg/60 px-2.5 py-1 text-sm">
                <span className="text-muted">{c.label}:</span> {c.from} → <span className="font-semibold text-gold">{c.to}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {advice.alts.length > 0 && (
        <section className={`${cardClass} space-y-3`}>
          <h2 className="font-display text-lg font-bold text-ink">Também vale</h2>
          {advice.alts.map((a) => (
            <AltRow key={a.name} data={data} pick={a} />
          ))}
        </section>
      )}

      <details className={cardClass}>
        <summary className="cursor-pointer font-semibold text-ink">Todos os modificadores possíveis ({possible.length})</summary>
        <p className="mt-2 text-xs text-muted">Do mais valioso ao menos valioso (ordem da wiki).</p>
        <ul className="mt-2 divide-y divide-line/60">
          {possible.map((n) => (
            <li key={n} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="sm:w-48 sm:shrink-0">
                <ModName data={data} name={n} />
              </span>
              <Effects data={data} name={n} />
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}

function AltRow({ data, pick }: { data: ToolsData; pick: Pick }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <ModName data={data} name={pick.name} />
        <Effects data={data} name={pick.name} />
      </div>
      <p className="text-sm text-muted">{pick.why}</p>
    </div>
  )
}

function AccessoryResult({ book, data, item }: { book: RecipeBook; data: ToolsData; item: ToolItem }) {
  const { playerClass } = useToolClass()
  const own = accessoryClass(data, item.name)
  const highlight = own ?? playerClass

  return (
    <>
      <ItemHeader book={book} item={item}>
        {own ? (
          <>
            Acessório de <span className="font-semibold text-accent">{CLASS_LABELS[own]}</span>.
          </>
        ) : (
          'Acessório: todos recebem os mesmos modificadores.'
        )}
      </ItemHeader>

      <section className={`${cardClass} space-y-2 border-gold/40`}>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Para qualquer classe</p>
        <ModName data={data} name={SAFE_PICK.name} big />
        <Effects data={data} name={SAFE_PICK.name} />
        <p className="text-ink">{SAFE_PICK.why}</p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-bold text-ink">Para mais dano, por classe</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(ACCESSORY_ADVICE) as PlayerClass[]).map((c) => {
            const a = ACCESSORY_ADVICE[c]
            return (
              <div key={c} className={`${cardClass} space-y-2 ${highlight === c ? 'border-accent' : ''}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                  {CLASS_LABELS[c]}
                  {highlight === c && <span className="rounded-full bg-accent/15 px-2 text-xs">{own === c ? 'deste acessório' : 'sua classe'}</span>}
                </p>
                <AltRow data={data} pick={a.best} />
                {a.alt && <AltRow data={data} pick={a.alt} />}
              </div>
            )
          })}
        </div>
      </section>

      <details className={cardClass}>
        <summary className="cursor-pointer font-semibold text-ink">Todos os modificadores de acessório ({data.modCats.accessory.length})</summary>
        <ul className="mt-2 divide-y divide-line/60">
          {data.modCats.accessory.map((a) => (
            <li key={a.name} className="flex items-baseline gap-3 py-2">
              <span className="w-44 shrink-0">
                <ModName data={data} name={a.name} />
              </span>
              <span className="text-sm text-green-400">
                {a.value} {ACC_EFFECT[a.effect] ?? a.effect}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}
