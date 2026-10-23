// Melhor modificador para reforjar (/ferramentas/modificador).
//
// Os números de cada modificador, quais tipos de arma podem ter cada grupo (Universal, Comum, Corpo a corpo...)
// e a ordem do mais ao menos valioso vêm da wiki (tools-data.json). As regras de "qual é o melhor" seguem a
// seção "Best modifiers" da página Modifiers da wiki; os textos do "porquê" são nossos.

import type { DamageClass, Modifier, ToolItem, ToolsData } from './toolsData'
import type { PlayerClass } from './world'

type Group = 'universal' | 'common' | 'melee' | 'ranged' | 'magic' | 'summon'

const SWORDS = new Set(['broadswords', 'shortswords'])
const SWUNG_TOOLS = new Set(['pickaxes', 'axes', 'hammers', 'hamaxes'])
const UNIVERSAL_ONLY = new Set(['spears', 'yoyos', 'flails', 'boomerangs', 'drills', 'chainsaws'])
// Espadas que a wiki não põe em "broadswords", mas que são golpeadas como uma
const SWUNG_EXTRA = new Set(['Zenith'])
// Magias cujo projétil fica depois de trocar de arma: o crítico é o da arma na mão, só o dano conta
const LINGERING_MAGIC = new Set(['Clinger Staff', 'Magnet Sphere', 'Rainbow Gun'])
// Lacaios/sentinelas com dano base alto o bastante para Ruthless ganhar de Fabled
const BIG_SUMMONS = new Set(['Ballista Staff', 'Stardust Dragon Staff', 'Desert Tiger Staff'])

export const CLASS_OF: Record<DamageClass, PlayerClass> = { melee: 'melee', ranged: 'ranged', magic: 'magic', summon: 'summoner' }

/** Grupos de modificadores que a arma aceita (conforme a página Modifiers da wiki). */
export function groupsFor(item: ToolItem): Group[] {
  const cat = item.cat ?? ''
  if (cat === 'whips') return ['universal', 'common', 'melee']
  if (item.class === 'summon') return ['summon', 'universal']
  if (UNIVERSAL_ONLY.has(cat)) return ['universal']
  if (item.class === 'melee') {
    if (SWORDS.has(cat) || SWUNG_TOOLS.has(cat) || SWUNG_EXTRA.has(item.name)) return ['universal', 'common', 'melee']
    return ['universal']
  }
  if (item.class === 'ranged') return ['universal', 'common', 'ranged']
  if (item.class === 'magic') return ['universal', 'common', 'magic']
  return ['universal']
}

/** Pode ter modificador? (armas que se gastam e itens sem dano não podem) */
export const canReforge = (item: ToolItem) =>
  item.kind === 'accessory' || ((item.kind === 'weapon' || item.kind === 'tool') && !item.consumable && (item.damage ?? 0) > 0)

/** Todos os modificadores que a arma pode ter, do mais ao menos valioso. */
export function possibleModifiers(d: ToolsData, item: ToolItem): string[] {
  const groups = groupsFor(item)
  const allowed = new Set(groups.flatMap((g) => d.modCats[g]))
  const noKnockback = !item.knockback
  const summonStaff = item.class === 'summon' && item.cat !== 'whips'
  return d.modCats.order.filter((name) => {
    if (!allowed.has(name)) return false
    const m = d.modifiers[name]
    if (!m) return false
    if (noKnockback && m.knockback !== undefined) return false
    // Lacaios não dão crítico: cajados de invocação só pegam os universais sem crítico
    if (summonStaff && m.critical !== undefined) return false
    return true
  })
}

export interface Pick {
  name: string
  why: string
}

export interface WeaponAdvice {
  best: Pick
  alts: Pick[]
  /** Explica o tipo da arma ("lança: só aceita modificadores universais") */
  kindNote: string
}

/** O primeiro da lista de preferência que a arma pode ter. */
function first(possible: string[], prefs: string[]) {
  return prefs.find((p) => possible.includes(p)) ?? possible[0]
}

/** Melhor modificador para a arma e alternativas (só as que ela pode ter). */
export function weaponAdvice(d: ToolsData, item: ToolItem): WeaponAdvice {
  const possible = possibleModifiers(d, item)
  const advice = rawAdvice(item, possible)
  return { ...advice, alts: advice.alts.filter((a) => a.name !== advice.best.name && possible.includes(a.name)) }
}

function rawAdvice(item: ToolItem, possible: string[]): WeaponAdvice {
  const cat = item.cat ?? ''
  const noKb = !item.knockback
  const kbNote = noKb ? ' Esta arma não tem repulsão, então modificadores que mexem nela não aparecem.' : ''

  if (item.name === 'Terrarian')
    return {
      best: { name: 'Legendary2', why: 'O Terrariano tem um Lendário só dele: mais dano, crítico e repulsão.' },
      alts: [],
      kindNote: 'Ioiô especial: não pega modificadores de corpo a corpo, só universais e o Lendário próprio.',
    }

  if (SWUNG_TOOLS.has(cat) || cat === 'drills' || cat === 'chainsaws') {
    const mining = cat === 'drills' || cat === 'chainsaws' ? null : 'Light'
    const combat = first(possible, ['Legendary', 'Godly', 'Demonic'])
    return {
      best: mining
        ? { name: mining, why: 'Para minerar e cortar, o que importa é a velocidade: Leve é o que mais acelera a ferramenta.' }
        : { name: combat, why: 'Brocas e motosserras só aceitam modificadores universais; este dá mais dano e crítico.' },
      alts: mining ? [{ name: combat, why: 'Se for usar para lutar: mais dano, crítico, tamanho e quase a mesma velocidade.' }] : [],
      kindNote: mining ? 'Ferramenta golpeada: aceita modificadores universais, comuns e de corpo a corpo.' : 'Só aceita modificadores universais.',
    }
  }

  if (cat === 'whips')
    return {
      best: { name: first(possible, ['Legendary', 'Godly']), why: 'Chicotes pegam modificadores de corpo a corpo, e Lendário dá o máximo de dano, velocidade e alcance.' },
      alts: [],
      kindNote: 'Chicote (Invocador): aceita modificadores universais, comuns e de corpo a corpo.',
    }

  if (item.class === 'summon') {
    const best = first(possible, ['Fabled', 'Worthy', 'Eager'])
    const alts: Pick[] = []
    if (best === 'Fabled') alts.push({ name: 'Eager', why: 'Se você quase não usa chicote, Impaciente costuma dar mais dano (muita penetração de armadura).' })
    if (BIG_SUMMONS.has(item.name)) alts.push({ name: 'Ruthless', why: 'Com dano base muito alto (bem montado), Implacável passa o Fabuloso por ter o maior bônus de dano.' })
    if (item.name === 'Blade Staff') alts.push({ name: 'Ballistic', why: 'No Cajado de Lâminas, Balístico também é ótimo contra inimigos de pouca defesa.' })
    return {
      best: {
        name: best,
        why:
          best === 'Fabled'
            ? 'O melhor de invocação: mais dano, penetração de armadura e dano de marcação quando o alvo leva chicotada.'
            : 'Sem repulsão, este é o que mais aumenta o dano dos lacaios e sentinelas.',
      },
      alts,
      kindNote: 'Cajado de invocação: aceita os modificadores de invocação e os universais sem crítico (lacaios não dão crítico).' + kbNote,
    }
  }

  if (item.class === 'melee') {
    const swung = groupsFor(item).includes('melee')
    const best = first(possible, swung ? ['Legendary', 'Godly', 'Demonic'] : ['Godly', 'Demonic'])
    return {
      best: {
        name: best,
        why:
          best === 'Legendary'
            ? 'O melhor de corpo a corpo: mais dano, velocidade, crítico, tamanho e repulsão.'
            : best === 'Godly'
              ? 'Esta arma só aceita universais, e Divino é o melhor deles: dano, crítico e repulsão.'
              : 'Demoníaco dá o mesmo dano e crítico do Divino, sem a repulsão que esta arma não tem.',
      },
      alts: [],
      kindNote: (swung
        ? 'Arma golpeada: aceita modificadores universais, comuns e de corpo a corpo.'
        : 'Lanças, ioiôs, manguais, bumerangues e outras armas que não são golpeadas só aceitam universais (a velocidade delas não muda).') + kbNote,
    }
  }

  if (item.class === 'ranged') {
    if (item.name === 'Chain Gun')
      return {
        best: { name: 'Rapid', why: 'A Metralhadora já atira tão rápido que só aceita aumento de velocidade acima de 10%: Acelerado é o que mais acelera.' },
        alts: [{ name: 'Demonic', why: 'Gasta menos munição e dá mais dano por tiro.' }],
        kindNote: 'Caso especial da wiki.',
      }
    if (item.name === 'Harpoon')
      return {
        best: { name: 'Godly', why: 'O Arpão não aceita Surreal; Divino é o melhor que ele pega.' },
        alts: [],
        kindNote: 'Caso especial da wiki.',
      }
    const best = first(possible, ['Unreal', 'Demonic', 'Deadly'])
    return {
      best: {
        name: best,
        why:
          best === 'Unreal'
            ? 'O melhor à distância: dano, velocidade, crítico, velocidade do projétil e repulsão.'
            : 'Sem repulsão na arma, Demoníaco (dano e crítico) é o melhor.',
      },
      alts: best === 'Demonic' ? [{ name: 'Deadly2', why: 'Mortal fica quase empatado: um pouco menos de dano, mas atira mais rápido.' }] : [],
      kindNote: 'Arma à distância: aceita modificadores universais, comuns e de À distância.' + kbNote,
    }
  }

  if (item.class === 'magic') {
    if (LINGERING_MAGIC.has(item.name))
      return {
        best: { name: 'Ruthless', why: 'O projétil fica depois de trocar de arma e usa o crítico da arma na mão, então só o dano conta: Implacável dá mais.' },
        alts: [],
        kindNote: 'Caso especial da wiki.',
      }
    const best = first(possible, ['Mythical', 'Demonic'])
    return {
      best: {
        name: best,
        why:
          best === 'Mythical'
            ? 'O melhor de magia: dano, velocidade, crítico, repulsão e menos mana por uso.'
            : 'Sem repulsão na arma, Demoníaco (dano e crítico) é o melhor.',
      },
      alts: [{ name: best === 'Mythical' ? 'Masterful' : 'Mystic', why: 'Se a sua mana máxima ainda é baixa: gasta 15% menos mana por uso.' }],
      kindNote: 'Arma mágica: aceita modificadores universais, comuns e de magia.' + kbNote,
    }
  }

  return { best: { name: first(possible, ['Godly', 'Demonic']), why: 'O melhor dos universais.' }, alts: [], kindNote: '' }
}

// ---------- Acessórios ----------

export interface AccessoryAdvice {
  best: Pick
  alt?: Pick
}

export const SAFE_PICK: Pick = {
  name: 'Warding',
  why: '+4 de defesa em cada acessório: o mais seguro, principalmente antes do Modo Difícil ou se você morre muito.',
}

export const ACCESSORY_ADVICE: Record<PlayerClass, AccessoryAdvice> = {
  melee: {
    best: { name: 'Menacing', why: '+4% de dano em tudo; troque alguns por Guarda se estiver morrendo.' },
    alt: { name: 'Violent', why: 'Só vale com armas que batem mais rápido com velocidade (ex.: Lâmina da Terra); nas de projétil quase não muda.' },
  },
  ranged: {
    best: { name: 'Menacing', why: 'Misture Ameaçador (dano) e Sortudo (crítico): os dois se multiplicam, então dividir dá mais que só um.' },
    alt: { name: 'Lucky', why: '+4% de crítico; melhor que Ameaçador quando você já tem muito bônus de dano e pouco crítico.' },
  },
  magic: {
    best: { name: 'Menacing', why: 'Misture Ameaçador (dano) e Sortudo (crítico): os dois se multiplicam, então dividir dá mais que só um.' },
    alt: { name: 'Arcane', why: '+20 de mana: só no começo, enquanto a mana máxima ainda é pouca.' },
  },
  summoner: {
    best: { name: 'Menacing', why: 'Lacaios e sentinelas não dão crítico, então Sortudo não ajuda: Ameaçador aumenta o dano deles.' },
    alt: { name: 'Violent', why: 'Ajuda se você bate muito com chicote (ele fica mais rápido).' },
  },
}

/** Classe de um acessório pelos bônus dele (só quando ajuda uma classe só). */
export function accessoryClass(d: ToolsData, name: string): PlayerClass | null {
  const e = d.equip[name] ?? {}
  const found = new Set<PlayerClass>()
  if (e.meleeDamage || e.meleeCrit || e.meleeSpeed) found.add('melee')
  if (e.rangedDamage || e.rangedCrit || e.arrowDamage || e.bulletDamage || e.rocketDamage || e.magicQuiver) found.add('ranged')
  if (e.magicDamage || e.magicCrit || e.manaCost || e.manaFlower || e.statManaMax2) found.add('magic')
  if (e.minionDamage || e.maxMinions || e.maxTurrets || e.whipRangeMultiplier || e.dd2Accessory) found.add('summoner')
  return found.size === 1 ? [...found][0] : null
}

// ---------- Textos ----------

const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`

/** Efeitos de um modificador em PT ("+15% dano, +5% crítico"). Velocidade e mana: menos é melhor. */
export function describeModifier(m: Modifier): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = []
  if (m.damage !== undefined) out.push({ text: `${pct(m.damage - 1)} dano`, good: m.damage > 1 })
  if (m.speed !== undefined) out.push({ text: `${pct(1 - m.speed)} velocidade`, good: m.speed < 1 })
  if (m.critical !== undefined) out.push({ text: `${m.critical > 0 ? '+' : '−'}${Math.abs(m.critical)}% crítico`, good: m.critical > 0 })
  if (m.mana !== undefined) out.push({ text: `${pct(m.mana - 1)} custo de mana`, good: m.mana < 1 })
  if (m.size !== undefined) out.push({ text: `${pct(m.size - 1)} tamanho`, good: m.size > 1 })
  if (m.velocity !== undefined) out.push({ text: `${pct(m.velocity - 1)} vel. do projétil`, good: m.velocity > 1 })
  if (m.arpen !== undefined) out.push({ text: `+${m.arpen} penetração de armadura`, good: true })
  if (m.tag !== undefined) out.push({ text: `+${m.tag} dano de marcação`, good: true })
  if (m.knockback !== undefined) out.push({ text: `${pct(m.knockback - 1)} repulsão`, good: m.knockback > 1 })
  return out
}

/** Números da arma com o modificador (dano 85 → 98, tempo de uso 18 → 16...). */
export function applyModifier(item: ToolItem, m: Modifier) {
  const rows: { label: string; from: number; to: number }[] = []
  if (item.damage && m.damage) rows.push({ label: 'Dano', from: item.damage, to: Math.round(item.damage * m.damage) })
  if (item.useTime && m.speed) rows.push({ label: 'Tempo de uso', from: item.useTime, to: Math.round(item.useTime * m.speed) })
  if (item.crit !== null && m.critical) rows.push({ label: 'Crítico %', from: item.crit, to: item.crit + m.critical })
  if (item.mana && m.mana) rows.push({ label: 'Mana', from: item.mana, to: Math.round(item.mana * m.mana) })
  if (item.knockback && m.knockback) rows.push({ label: 'Repulsão', from: item.knockback, to: Math.round(item.knockback * m.knockback * 100) / 100 })
  return rows
}

/** "Lendário (Legendary)". "Legendary2" e "Quick2" viram o nome normal. */
export function modifierLabel(d: ToolsData, name: string) {
  const en = name.replace(/\d$/, '')
  const pt = d.modifierPt[name] ?? d.modifierPt[en]
  return { pt: pt ?? en, en }
}
