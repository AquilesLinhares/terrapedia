// Comparador de itens (/ferramentas/comparar): textos em PT para os números da wiki (tools-data.json).

import { WIKI_BASE } from './wikiApi'
import type { EquipStats, ToolItem } from './toolsData'

/** Velocidade pelo tempo de uso, nas mesmas faixas do jogo. */
export function speedLabel(useTime: number) {
  if (useTime <= 8) return 'Rapidíssima'
  if (useTime <= 20) return 'Muito rápida'
  if (useTime <= 25) return 'Rápida'
  if (useTime <= 30) return 'Média'
  if (useTime <= 35) return 'Lenta'
  if (useTime <= 45) return 'Muito lenta'
  if (useTime <= 55) return 'Extremamente lenta'
  return 'Lentíssima'
}

/** Repulsão, nas mesmas faixas do jogo. */
export function knockbackLabel(kb: number) {
  if (kb === 0) return 'Nenhuma'
  if (kb <= 1.5) return 'Extremamente fraca'
  if (kb <= 3) return 'Muito fraca'
  if (kb <= 4) return 'Fraca'
  if (kb <= 6) return 'Média'
  if (kb <= 7) return 'Forte'
  if (kb <= 9) return 'Muito forte'
  if (kb <= 11) return 'Extremamente forte'
  return 'Insana'
}

const RARITY: Record<number, string> = {
  [-13]: 'Mestre',
  [-12]: 'Expert',
  [-11]: 'Âmbar (missão)',
  [-1]: 'Cinza',
  0: 'Branca',
  1: 'Azul',
  2: 'Verde',
  3: 'Laranja',
  4: 'Vermelho-claro',
  5: 'Rosa',
  6: 'Roxo-claro',
  7: 'Verde-limão',
  8: 'Amarela',
  9: 'Ciano',
  10: 'Vermelha',
  11: 'Roxa',
}
export const rarityLabel = (rare: number) => RARITY[rare] ?? String(rare)

export const CATEGORY_PT: Record<string, string> = {
  whips: 'Chicote',
  broadswords: 'Espada',
  shortswords: 'Espada curta',
  spears: 'Lança',
  yoyos: 'Ioiô',
  flails: 'Mangual',
  boomerangs: 'Bumerangue',
  bows: 'Arco',
  repeaters: 'Besta',
  guns: 'Arma de fogo',
  launchers: 'Lançador',
  'magic guns': 'Arma mágica',
  wands: 'Cajado',
  'spell books': 'Livro de magia',
  instruments: 'Instrumento',
  'minion summon items': 'Cajado de lacaio',
  'sentry summon items': 'Cajado de sentinela',
  pickaxes: 'Picareta',
  drills: 'Broca',
  axes: 'Machado',
  chainsaws: 'Motosserra',
  hammers: 'Martelo',
  hamaxes: 'Martelo-machado',
  'projectile melee': 'Corpo a corpo de projétil',
  explosives: 'Explosivo',
}

export const KIND_PT = { weapon: 'Arma', accessory: 'Acessório', armor: 'Armadura', tool: 'Ferramenta' } as const
export const SLOT_PT = { head: 'cabeça', body: 'corpo', legs: 'pernas' } as const

const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`

/** Bônus de equipamento em frases curtas ("+12% dano corpo a corpo", "imune a repulsão"). */
export function describeEquip(e: EquipStats): string[] {
  const out: string[] = []
  const n = (k: string) => Number(e[k] ?? 0)
  const dmg = ['meleeDamage', 'rangedDamage', 'magicDamage', 'minionDamage'].map(n)
  if (dmg.every((v) => v && v === dmg[0])) out.push(`${pct(dmg[0])} dano`)
  else {
    if (dmg[0]) out.push(`${pct(dmg[0])} dano corpo a corpo`)
    if (dmg[1]) out.push(`${pct(dmg[1])} dano à distância`)
    if (dmg[2]) out.push(`${pct(dmg[2])} dano mágico`)
    if (dmg[3]) out.push(`${pct(dmg[3])} dano de invocação`)
  }
  const crit = ['meleeCrit', 'rangedCrit', 'magicCrit'].map(n)
  if (crit.every((v) => v && v === crit[0])) out.push(`+${crit[0]}% crítico`)
  else {
    if (crit[0]) out.push(`+${crit[0]}% crítico corpo a corpo`)
    if (crit[1]) out.push(`+${crit[1]}% crítico à distância`)
    if (crit[2]) out.push(`+${crit[2]}% crítico mágico`)
  }
  if (n('meleeSpeed')) out.push(`${pct(n('meleeSpeed'))} velocidade corpo a corpo`)
  if (n('moveSpeed')) out.push(`${pct(n('moveSpeed'))} velocidade de movimento`)
  if (e.accRunSpeed) out.push('corre mais rápido')
  if (n('maxMinions')) out.push(`+${n('maxMinions')} lacaio`)
  if (n('maxTurrets')) out.push(`+${n('maxTurrets')} sentinela`)
  if (e.dd2Accessory) out.push('+1 sentinela (não soma com outro do Exército do Ancião)')
  if (n('whipRangeMultiplier')) out.push(`${pct(n('whipRangeMultiplier'))} alcance do chicote`)
  if (n('maxTagEffects')) out.push(`+${n('maxTagEffects')} marca de chicote ao mesmo tempo`)
  if (n('minionKB')) out.push('+repulsão dos lacaios')
  if (n('manaCost')) out.push(`${pct(n('manaCost'))} custo de mana`)
  if (n('statManaMax2')) out.push(`+${n('statManaMax2')} mana máxima`)
  if (n('manaRegenBonus')) out.push('mana volta mais rápido')
  if (n('lifeRegen')) out.push('regenera vida')
  if (n('endurance')) out.push(`−${Math.round(n('endurance') * 100)}% de dano recebido`)
  if (n('armorPenetration')) out.push(`+${n('armorPenetration')} penetração de armadura`)
  if (n('arrowDamage')) out.push(`${pct(n('arrowDamage'))} dano de flechas`)
  if (n('bulletDamage')) out.push(`${pct(n('bulletDamage'))} dano de balas`)
  if (n('rocketDamage')) out.push(`${pct(n('rocketDamage'))} dano de foguetes`)
  if (n('pickSpeed')) out.push(`${pct(-n('pickSpeed'))} velocidade de mineração`)
  if (e.jumpSpeedBoost) out.push('pula mais alto')
  if (e.ammoCost75) out.push('25% de chance de não gastar munição')
  else if (e.ammoCost80) out.push('20% de chance de não gastar munição')
  const flags: [string, string][] = [
    ['noKnockback', 'imune a repulsão'],
    ['noFallDmg', 'sem dano de queda'],
    ['fireWalk', 'anda em blocos quentes sem se queimar'],
    ['waterWalk', 'anda sobre a água'],
    ['lavaRose', 'menos dano da lava'],
    ['iceSkate', 'não escorrega no gelo'],
    ['magicQuiver', 'flechas mais fortes e mais rápidas'],
    ['magmaStone', 'ataques corpo a corpo queimam'],
    ['manaFlower', 'usa poção de mana sozinho'],
    ['manaMagnet', 'puxa estrelas de mana de longe'],
    ['longInvince', 'fica invencível por mais tempo depois de levar dano'],
    ['panic', 'fica mais rápido ao levar dano'],
    ['sporeSac', 'solta esporos que atacam inimigos'],
    ['yoyoGlove', 'usa dois ioiôs'],
    ['yoyoString', 'ioiô alcança mais longe'],
    ['kbGlove', '+repulsão corpo a corpo'],
    ['autoReuseGlove', 'golpe automático'],
    ['meleeScaleGlove', 'armas corpo a corpo maiores'],
    ['scope', 'enxerga mais longe com armas de fogo'],
    ['nightVision', 'enxerga melhor no escuro'],
    ['slowFall', 'cai devagar'],
    ['carpet', 'flutua por um tempo'],
    ['dashType', 'dá um avanço rápido (dash)'],
    ['rocketBoots', 'voa por um tempo'],
  ]
  for (const [k, text] of flags) if (e[k]) out.push(text)
  if (n('lavaMax')) out.push(`imune à lava por ${Math.round(n('lavaMax') / 60)} s`)
  if (n('buffImmune')) out.push(n('buffImmune') === 1 ? 'imune a um efeito negativo' : `imune a ${n('buffImmune')} efeitos negativos`)
  return out
}

/** Linhas numéricas do comparador. `better` diz se maior (1) ou menor (−1) é melhor. */
export interface StatRow {
  label: string
  value: (it: ToolItem) => number | null
  text: (v: number, it: ToolItem) => string
  better: 1 | -1
}

export const STAT_ROWS: StatRow[] = [
  { label: 'Dano', value: (it) => it.damage, text: (v) => String(v), better: 1 },
  {
    label: 'Velocidade',
    // Cajados de invocação: o tempo de uso é só de chamar o lacaio, não de atacar
    value: (it) => (it.class === 'summon' && it.cat !== 'whips' ? null : it.useTime),
    text: (v) => `${speedLabel(v)} (${v})`,
    better: -1,
  },
  { label: 'Repulsão', value: (it) => (it.kind === 'weapon' || it.kind === 'tool' ? it.knockback : null), text: (v) => `${knockbackLabel(v)} (${v})`, better: 1 },
  { label: 'Crítico', value: (it) => it.crit, text: (v) => `${v}%`, better: 1 },
  { label: 'Vel. do projétil', value: (it) => it.velocity, text: (v) => String(v), better: 1 },
  { label: 'Mana por uso', value: (it) => it.mana, text: (v) => String(v), better: -1 },
  { label: 'Defesa', value: (it) => it.defense, text: (v) => String(v), better: 1 },
]

/** Texto do item no jogo (em inglês), direto da wiki. Só para mostrar: não fica salvo. */
export async function fetchTooltips(names: string[]): Promise<Record<string, string>> {
  if (!names.length) return {}
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(',')
  const params = new URLSearchParams({
    action: 'cargoquery',
    tables: 'Items',
    fields: 'name,tooltip',
    where: `Items.name IN (${list})`,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const res = await fetch(`${WIKI_BASE}/api.php?${params}`)
  const data = (await res.json()) as { cargoquery?: { title: { name: string; tooltip: string } }[] }
  const out: Record<string, string> = {}
  for (const { title } of data.cargoquery ?? []) {
    const doc = new DOMParser().parseFromString(title.tooltip.replace(/<br\s*\/?>/g, '\n'), 'text/html')
    const text = doc.body.textContent?.trim()
    if (text && !out[title.name]) out[title.name] = text
  }
  return out
}
