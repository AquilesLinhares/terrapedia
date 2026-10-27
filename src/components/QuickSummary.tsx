import { Link } from 'react-router-dom'
import type { LocalInfo } from '../lib/localInfo'
import { ptName } from '../lib/recipes'
import { SET_NAMES } from '../lib/toolsData'
import { applyModifier, canReforge, describeModifier, modifierLabel, weaponAdvice } from '../lib/bestModifier'
import { CATEGORY_PT, KIND_PT, SLOT_PT, describeEquip, knockbackLabel, rarityLabel, speedLabel } from '../lib/itemCompare'
import { articlePath } from './SearchBar'
import CraftingSection from './CraftingSection'
import NpcName from './NpcName'

const MODE_PT = { expert: 'Expert', master: 'Mestre' } as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="mb-1.5 text-sm font-semibold text-gold">{title}</h3>
      {children}
    </section>
  )
}

/** "Resumo rápido": tudo o que o app já sabe do item sem pedir nada à wiki. `null` se não há nada. */
export default function QuickSummary({ info }: { info: LocalInfo }) {
  const { book, tools, item, crafting, vendors, drops } = info
  const page = info.ref.page

  const stats: [string, string][] = []
  if (item) {
    const kind = item.cat && CATEGORY_PT[item.cat] ? CATEGORY_PT[item.cat] : KIND_PT[item.kind]
    stats.push(['Tipo', item.slot ? `${KIND_PT[item.kind]} (${SLOT_PT[item.slot]})` : kind])
    if (item.damage) stats.push(['Dano', String(item.damage)])
    if (item.useTime && !(item.class === 'summon' && item.cat !== 'whips')) stats.push(['Velocidade', `${speedLabel(item.useTime)} (${item.useTime})`])
    if (item.knockback && item.kind !== 'accessory' && item.kind !== 'armor') stats.push(['Repulsão', `${knockbackLabel(item.knockback)} (${item.knockback})`])
    if (item.crit) stats.push(['Crítico', `${item.crit}%`])
    if (item.mana) stats.push(['Mana por uso', String(item.mana)])
    if (item.defense) stats.push(['Defesa', String(item.defense)])
    if (item.rare !== null) stats.push(['Raridade', rarityLabel(item.rare)])
    if (item.hardmode) stats.push(['Disponível', 'Modo Difícil'])
  }
  const effects = tools ? describeEquip(tools.equip[page] ?? {}) : []

  const advice = tools && item && item.kind !== 'accessory' && canReforge(item) ? weaponAdvice(tools, item) : null
  const best = advice && tools ? modifierLabel(tools, advice.best.name) : null
  const bestMod = advice && tools ? tools.modifiers[advice.best.name] : undefined
  const bestEffects = bestMod ? describeModifier(bestMod) : []
  const bestNumbers = bestMod && item ? applyModifier(item, bestMod) : []

  const shownDrops = drops.slice(0, 6)
  const hasContent = stats.length || effects.length || advice || crafting || shownDrops.length || vendors.length || item?.buffs.length
  if (!hasContent) return null

  return (
    <details open className="mb-5 rounded-xl border border-line bg-panel/70 px-4 py-3">
      <summary className="cursor-pointer text-base font-semibold text-ink">
        Resumo rápido <span className="text-xs font-normal text-muted">· dados do app, em português</span>
      </summary>
      <div className="mt-3">
        {stats.length > 0 && (
          <Section title="Estatísticas">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {stats.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="m-0 font-medium">{v}</dd>
                </div>
              ))}
              {item?.set && (
                <>
                  <dt className="text-muted">Conjunto</dt>
                  <dd className="m-0 font-medium">{SET_NAMES[item.set] ?? ptName(book, item.set)}</dd>
                </>
              )}
            </dl>
            {effects.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {effects.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {item && item.buffs.length > 0 && (
              <p className="mt-2 text-sm text-muted">Efeitos: {item.buffs.map((b) => ptName(book, b)).join(', ')}</p>
            )}
          </Section>
        )}

        {stats.length === 0 && effects.length > 0 && (
          <Section title="Efeitos">
            <ul className="m-0 list-disc pl-5 text-sm">
              {effects.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Section>
        )}

        {advice && best && (
          <Section title="Melhor modificador">
            <p className="m-0 text-sm">
              <Link to={`/ferramentas/modificador?item=${encodeURIComponent(page)}`} className="font-semibold text-accent hover:underline">
                {best.pt}
              </Link>
              {best.pt !== best.en && <span className="text-muted"> ({best.en})</span>}
              {bestEffects.length > 0 && <span className="text-muted"> — {bestEffects.map((e) => e.text).join(', ')}</span>}
            </p>
            <p className="mt-1 text-sm text-muted">{advice.best.why}</p>
            {bestNumbers.length > 0 && (
              <p className="mt-1 text-sm text-muted">{bestNumbers.map((r) => `${r.label} ${r.from} → ${r.to}`).join(' · ')}</p>
            )}
          </Section>
        )}

        {crafting && (
          <Section title="Receitas e usos">
            <CraftingSection book={book} crafting={{ ...crafting, recipes: crafting.recipes.slice(0, 3), uses: crafting.uses.slice(0, 3) }} />
          </Section>
        )}

        {shownDrops.length > 0 && (
          <Section title="De onde vem">
            <ul className="m-0 list-disc pl-5 text-sm">
              {shownDrops.map(([source, chance, mode]) => (
                <li key={source + (mode ?? '')}>
                  <Link to={articlePath(source)} className="text-accent hover:underline">
                    {ptName(book, source)}
                  </Link>
                  {chance !== null && <span className="text-muted"> — {chance}%</span>}
                  {mode && <span className="text-muted"> (só {MODE_PT[mode]})</span>}
                </li>
              ))}
            </ul>
            {drops.length > shownDrops.length && <p className="mt-1 text-xs text-muted">e mais {drops.length - shownDrops.length} fonte(s) no artigo.</p>}
          </Section>
        )}

        {vendors.length > 0 && (
          <Section title="Quem vende">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {vendors.map((npc) => (
                <NpcName key={npc} book={book} name={npc} />
              ))}
            </div>
            <Link to={`/ferramentas/vendedores?item=${encodeURIComponent(page)}`} className="mt-1.5 inline-block text-xs text-accent hover:underline">
              Ver preços e condições
            </Link>
          </Section>
        )}
      </div>
    </details>
  )
}
