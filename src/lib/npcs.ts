// NPCs das Ferramentas (Felicidade dos NPCs e Vendedores).
//
// Dados da wiki em src/data/npc-data.json (scripts/build-npcs.mjs): preferências de bioma/vizinhos e lojas.
// Aqui ficam o que escrevemos nós (como cada NPC chega, nomes dos biomas) e o cálculo da felicidade, pelas
// regras da página "NPCs" da wiki (seção Happiness, versão 1.4.5).

import { useEffect, useState } from 'react'
import { milestoneStage, STAGES, stageAtLeast, type StageId } from './progression'

export type BiomeId = 'forest' | 'underground' | 'desert' | 'snow' | 'jungle' | 'ocean' | 'hallow' | 'mushroom'
export type Level = 'love' | 'like' | 'dislike' | 'hate'

export interface NpcPrefs {
  biome: Partial<Record<BiomeId, Level>>
  npc: Record<string, Level>
}

/** Condição de venda: texto PT (com [[Item]], {lua:1,2} e {pilone}) e o que dá para conferir pelo mundo. */
export interface ShopCondition {
  pt: string
  stage?: StageId
  /** Chefes/eventos (keys de MILESTONES) que precisam ter sido derrotados */
  needs?: string[]
}

export interface ShopItem {
  item: string
  /** Preço em moedas de cobre, ou em Medalhas do Defensor */
  price: { copper: number } | { medals: number } | null
  cond: ShopCondition | null
}

export interface NpcData {
  source: { date: string; prefsRevid: number; shops: Record<string, number> }
  prefs: Record<string, NpcPrefs>
  shops: Record<string, ShopItem[]>
}

let data: Promise<NpcData> | null = null

export function loadNpcData(): Promise<NpcData> {
  data ??= import('../data/npc-data.json').then(({ default: json }) => {
    const raw = json as unknown as {
      source: NpcData['source']
      prefs: NpcData['prefs']
      conditions: ShopCondition[]
      shops: Record<string, [string, (number | string)?, number?][]>
    }
    const shops: NpcData['shops'] = {}
    for (const [npc, rows] of Object.entries(raw.shops)) {
      shops[npc] = rows.map(([item, price = 0, cond = 0]) => ({
        item,
        price: typeof price === 'string' ? { medals: parseInt(price) } : price ? { copper: price } : null,
        cond: cond ? raw.conditions[cond - 1] : null,
      }))
    }
    return { source: raw.source, prefs: raw.prefs, shops }
  })
  return data
}

export function useNpcData() {
  const [value, setValue] = useState<NpcData | null>(null)
  useEffect(() => {
    let alive = true
    loadNpcData().then((d) => alive && setValue(d))
    return () => {
      alive = false
    }
  }, [])
  return value
}

/** Ícone do mapa (cabeça) de um NPC. */
export const npcIcon = (name: string) => `https://terraria.wiki.gg/images/Map_Icon_${encodeURIComponent(name.replace(/ /g, '_'))}.png`

// ---------- Biomas ----------

export const BIOMES: { id: BiomeId; label: string; pylon: string; hardmode?: boolean }[] = [
  { id: 'forest', label: 'Floresta', pylon: 'Forest Pylon' },
  { id: 'underground', label: 'Subterrâneo / Caverna / Submundo', pylon: 'Cavern Pylon' },
  { id: 'desert', label: 'Deserto', pylon: 'Desert Pylon' },
  { id: 'snow', label: 'Neve', pylon: 'Snow Pylon' },
  { id: 'jungle', label: 'Selva', pylon: 'Jungle Pylon' },
  { id: 'ocean', label: 'Oceano', pylon: 'Ocean Pylon' },
  { id: 'hallow', label: 'Sagrado', pylon: 'Hallow Pylon', hardmode: true },
  { id: 'mushroom', label: 'Cogumelos Brilhantes', pylon: 'Mushroom Pylon' },
]
export const biome = (id: BiomeId) => BIOMES.find((b) => b.id === id)!

// ---------- Como cada NPC chega ----------

export interface NpcInfo {
  name: string
  /** Como chega (nossas palavras, a partir da página "NPCs" da wiki) */
  arrives: string
  /** Etapa a partir da qual costuma estar no mundo (para "sugerir arranjo" e "liberado") */
  stage: StageId
  /** Chefe/evento opcional que precisa ter sido derrotado (key de MILESTONES) */
  needs?: string
  /** Vende itens (e por isso pode vender Pilones) */
  vendor?: boolean
  /** Vendedor que não vende Pilones (Taberneiro) */
  noPylon?: boolean
  /** Não mora em casa (aparece só na lista de vendedores) */
  visitor?: boolean
}

export const NPCS: NpcInfo[] = [
  { name: 'Guide', stage: 'start', arrives: 'Já começa no mundo.' },
  { name: 'Merchant', stage: 'start', vendor: true, arrives: 'Quando os jogadores juntos têm mais de 50 moedas de prata no inventário.' },
  { name: 'Nurse', stage: 'start', arrives: 'Quando alguém tem mais de 100 de vida máxima e o [[Merchant]] já mora no mundo.' },
  { name: 'Demolitionist', stage: 'start', vendor: true, arrives: 'Quando alguém tem um explosivo no inventário e o [[Merchant]] já mora no mundo.' },
  { name: 'Dye Trader', stage: 'start', vendor: true, arrives: 'Quando alguém tem uma tintura ou um ingrediente de tintura no inventário (e mais algumas condições).' },
  { name: 'Angler', stage: 'start', arrives: 'Encontrado dormindo no Oceano: fale com ele.' },
  { name: 'Zoologist', stage: 'start', vendor: true, arrives: 'Quando pelo menos 10% do Bestiário foi preenchido.' },
  { name: 'Arms Dealer', stage: 'start', vendor: true, arrives: 'Quando alguém tem balas ou uma arma que atira balas no inventário.' },
  { name: 'Painter', stage: 'start', vendor: true, arrives: 'Quando já há outros 8 NPCs morando no mundo.' },
  { name: 'Golfer', stage: 'start', vendor: true, arrives: 'Encontrado no Deserto Subterrâneo: fale com ele.' },
  { name: 'Stylist', stage: 'start', vendor: true, arrives: 'Encontrada presa numa teia, num ninho de aranha no subterrâneo: fale com ela.' },
  { name: 'Party Girl', stage: 'start', vendor: true, arrives: 'Quando já há outros 14 NPCs morando no mundo.' },
  { name: 'Dryad', stage: 'post-eye', vendor: true, arrives: 'Depois de derrotar o Olho de Cthulhu, o Devorador/Cérebro ou o Esqueletron.' },
  { name: 'Goblin Tinkerer', stage: 'post-eye', needs: 'Goblin Army', vendor: true, arrives: 'Depois do Exército Goblin, aparece amarrado na camada de cavernas: fale com ele.' },
  { name: 'Tavernkeep', stage: 'post-evil', vendor: true, noPylon: true, arrives: 'Depois do Devorador/Cérebro, aparece desmaiado na superfície: fale com ele.' },
  { name: 'Witch Doctor', stage: 'post-evil', needs: 'Queen Bee', vendor: true, arrives: 'Depois de derrotar a Abelha Rainha.' },
  { name: 'Clothier', stage: 'post-skeletron', vendor: true, arrives: 'Depois de derrotar o Esqueletron (o Velho da Masmorra vira o Alfaiate).' },
  { name: 'Mechanic', stage: 'post-skeletron', vendor: true, arrives: 'Depois do Esqueletron, encontrada amarrada na Masmorra: fale com ela.' },
  { name: 'Wizard', stage: 'hardmode', vendor: true, arrives: 'No Modo Difícil, encontrado amarrado na camada de cavernas: fale com ele.' },
  { name: 'Tax Collector', stage: 'hardmode', arrives: 'No Modo Difícil, jogue Pó Purificador numa Alma Torturada no Submundo.' },
  { name: 'Truffle', stage: 'hardmode', vendor: true, arrives: 'No Modo Difícil, com uma casa vaga num bioma de Cogumelos Brilhantes na superfície.' },
  { name: 'Pirate', stage: 'hardmode', needs: 'Pirate Invasion', vendor: true, arrives: 'Depois de derrotar a Invasão Pirata.' },
  { name: 'Steampunker', stage: 'post-mech', vendor: true, arrives: 'Depois de derrotar um chefe mecânico.' },
  { name: 'Cyborg', stage: 'post-plantera', vendor: true, arrives: 'Depois de derrotar a Plantera.' },
  { name: 'Santa Claus', stage: 'hardmode', needs: 'Frost Legion', vendor: true, arrives: 'Depois da Legião Congelada, só na época de Natal (vai embora quando ela acaba).' },
  { name: 'Princess', stage: 'post-plantera', vendor: true, arrives: 'Quando todos os outros NPCs (menos Papai Noel e os bichinhos) moram no mundo.' },
  { name: 'Skeleton Merchant', stage: 'start', vendor: true, visitor: true, arrives: 'Aparece às vezes nas cavernas, em qualquer etapa. Não mora em casa.' },
  { name: 'Traveling Merchant', stage: 'start', vendor: true, visitor: true, arrives: 'Visita de dia, às vezes, quando já há 2 NPCs morando no mundo. Vende itens sorteados a cada visita.' },
]
export const npcInfo = (name: string) => NPCS.find((n) => n.name === name)

/**
 * O NPC já pode estar no mundo? Com mundo ativo confere o chefe/evento que ele precisa; sem mundo
 * (`defeated` null) só olha a etapa.
 */
export function npcUnlocked(info: NpcInfo, stage: StageId, defeated: Set<string> | null) {
  if (!stageAtLeast(stage, info.stage)) return false
  return !info.needs || !defeated || defeated.has(info.needs)
}

/**
 * Condição de venda já cumprida no mundo (etapa e chefes)? Outras condições (noite, bioma...) não contam.
 * Sem mundo ativo (`defeated` null), cada chefe pedido vale pela etapa em que ele costuma cair.
 */
export function conditionUnlocked(cond: ShopCondition | null, stage: StageId, defeated: Set<string> | null) {
  if (!cond) return true
  if (cond.stage && !stageAtLeast(stage, cond.stage)) return false
  if (!cond.needs) return true
  return defeated ? cond.needs.every((k) => defeated.has(k)) : cond.needs.every((k) => stageAtLeast(stage, milestoneStage(k)))
}

// ---------- Felicidade ----------

export interface House {
  id: string
  biome: BiomeId
  npcs: string[]
}

const LEVEL_FACTOR: Record<Level, number> = { love: 0.88, like: 0.94, dislike: 1.06, hate: 1.12 }
export const LEVEL_LABEL: Record<Level, string> = { love: 'ama', like: 'gosta de', dislike: 'não gosta de', hate: 'odeia' }

export interface MoodReason {
  kind: 'solitude' | 'crowded' | 'biome' | 'npc'
  level?: Level
  /** NPC vizinho (kind 'npc') */
  npc?: string
  factor: number
}

export interface Mood {
  /** Multiplicador do preço de compra (0.75 a 1.5) */
  factor: number
  reasons: MoodReason[]
}

/**
 * Felicidade de um NPC numa casa. Considera que todos da casa moram a até 25 blocos um do outro e que as
 * outras casas estão a mais de 120 blocos (é o que dá o bônus de solidão).
 */
export function npcMood(name: string, house: House, prefs: Record<string, NpcPrefs>): Mood {
  const p = prefs[name]
  const reasons: MoodReason[] = []
  const others = house.npcs.filter((n) => n !== name)
  if (others.length <= 2) reasons.push({ kind: 'solitude', factor: 0.95 })
  if (others.length > 3) reasons.push({ kind: 'crowded', factor: 1.05 ** (others.length - 3) })
  const b = p?.biome[house.biome]
  if (b) reasons.push({ kind: 'biome', level: b, factor: LEVEL_FACTOR[b] })
  for (const o of others) {
    const level = p?.npc[o]
    if (level) reasons.push({ kind: 'npc', npc: o, level, factor: LEVEL_FACTOR[level] })
  }
  const raw = reasons.reduce((f, r) => f * r.factor, 1)
  return { factor: Math.round(Math.min(1.5, Math.max(0.75, raw)) * 100) / 100, reasons }
}

/** Faixas dos ícones da wiki (≤82%, ≤100%, ≤110%, >110%). */
export function moodLabel(factor: number) {
  if (factor <= 0.82) return { label: 'Muito feliz', tone: 'text-green-400' }
  if (factor <= 1) return { label: 'Feliz', tone: 'text-lime-300' }
  if (factor <= 1.1) return { label: 'Insatisfeito', tone: 'text-amber-300' }
  return { label: 'Infeliz', tone: 'text-red-400' }
}

// Vendedores que vendem Pilones (página "Pylons" da wiki): todos menos Taberneiro e os visitantes
export const sellsPylons = (name: string) => {
  const info = npcInfo(name)
  return Boolean(info?.vendor && !info.visitor && !info.noPylon)
}

/**
 * Pilone que a casa libera: precisa de um vendedor e de pelo menos mais um NPC perto. Desde a 1.4.5 a
 * felicidade não importa mais. O do Sagrado só existe no Modo Difícil.
 */
export function housePylon(house: House) {
  if (house.npcs.length < 2 || !house.npcs.some(sellsPylons)) return null
  return biome(house.biome).pylon
}

// ---------- Sugerir arranjo ----------

/** Pontos de um arranjo (menor = melhor): soma dos preços − bônus por Pilone de bioma diferente. */
function score(houses: House[], prefs: Record<string, NpcPrefs>) {
  let total = 0
  const pylons = new Set<string>()
  for (const h of houses) {
    for (const n of h.npcs) total += npcMood(n, h, prefs).factor
    const pylon = housePylon(h)
    if (pylon) pylons.add(pylon)
    if (h.npcs.length === 1) total += 0.05 // casa de um NPC só não libera Pilone
  }
  return total - 0.04 * pylons.size
}

/**
 * Distribui os NPCs em casas boas (grupos pequenos, no bioma de que gostam, com vizinhos de que gostam).
 * Busca local com recomeços: muda um NPC de casa, troca dois de lugar ou troca o bioma de uma casa, e fica
 * com a mudança se não piorar. Rápido para 25 NPCs; cada clique pode dar um arranjo um pouco diferente.
 */
export function suggestHouses(npcs: string[], prefs: Record<string, NpcPrefs>, hardmode: boolean): House[] {
  if (!npcs.length) return []
  const biomes = BIOMES.filter((b) => hardmode || !b.hardmode).map((b) => b.id)
  const slots = Math.max(1, Math.ceil(npcs.length / 2))
  const rand = (n: number) => Math.floor(Math.random() * n)
  const favorite = (n: string) => {
    const p = prefs[n]?.biome ?? {}
    return biomes.find((b) => p[b] === 'love') ?? biomes.find((b) => p[b] === 'like') ?? 'forest'
  }

  let best: { houses: House[]; score: number } | null = null
  for (let round = 0; round < 6; round++) {
    // Começo: cada NPC (em ordem sorteada) na casa do bioma favorito, até 3 por casa.
    // `where[k]` = casa do NPC `order[k]`; `houseBiome[i]` = bioma da casa i (sobram casas vazias para mudar)
    const order = [...npcs].sort(() => Math.random() - 0.5)
    const houseBiome: BiomeId[] = []
    const where: number[] = []
    const build = () =>
      houseBiome
        .map((b, i) => ({ id: `h${i}`, biome: b, npcs: order.filter((_, k) => where[k] === i) }))
        .filter((h) => h.npcs.length > 0)
    for (const n of order) {
      const fav = favorite(n)
      let h = houseBiome.findIndex((b, i) => b === fav && where.filter((w) => w === i).length < 3)
      if (h < 0 && houseBiome.length < slots) h = houseBiome.push(fav) - 1
      if (h < 0) h = houseBiome.findIndex((_, i) => where.filter((w) => w === i).length < 3)
      if (h < 0) h = houseBiome.push(fav) - 1
      where.push(h)
    }
    while (houseBiome.length < slots + 2) houseBiome.push(biomes[rand(biomes.length)])

    let current = score(build(), prefs)
    for (let step = 0; step < 4000; step++) {
      const move = rand(3)
      if (move === 0) {
        const k = rand(order.length)
        const before = where[k]
        where[k] = rand(houseBiome.length)
        const s = score(build(), prefs)
        if (s <= current) current = s
        else where[k] = before
      } else if (move === 1) {
        const a = rand(order.length)
        const b = rand(order.length)
        ;[where[a], where[b]] = [where[b], where[a]]
        const s = score(build(), prefs)
        if (s <= current) current = s
        else [where[a], where[b]] = [where[b], where[a]]
      } else {
        const h = rand(houseBiome.length)
        const before = houseBiome[h]
        houseBiome[h] = biomes[rand(biomes.length)]
        const s = score(build(), prefs)
        if (s <= current) current = s
        else houseBiome[h] = before
      }
    }
    if (!best || current < best.score) best = { houses: build(), score: current }
  }
  return best!.houses.map((h, i) => ({ ...h, id: `${Date.now().toString(36)}-${i}` }))
}

/** Etapa é Modo Difícil ou depois? */
export const isHardmode = (stage: StageId) => STAGES.find((s) => s.id === stage)?.phase === 'hard'
