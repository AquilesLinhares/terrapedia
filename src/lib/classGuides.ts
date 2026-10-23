// Guias de classe (src/data/classes/*.json): o que usar em cada etapa do jogo, por classe.
// Escritos à mão (com IA, sem API paga) a partir de "Guide:Class setups" da wiki, organizados por nós.
// `node scripts/build-classes.mjs` confere o formato e gera src/data/exclusive-items.json (selos Expert/Mestre).
//
// As etapas são as mesmas do mundo compartilhado (`StageId` de progression.ts), então a página abre direto
// na etapa do mundo ativo. Textos usam as mesmas marcações das páginas reorganizadas ([[Item]], **negrito**).

import type { Text } from './guides'
import type { StageId } from './progression'
import type { PlayerClass } from './world'

/** Item de um guia de classe: nome EN, ou com observação / quantidade / imagem própria / subclasses. */
export type ClassItem =
  | string
  | {
      name: string
      note?: Text
      qty?: string
      /** Arquivo da wiki para o sprite, quando o do item não serve (ex.: conjuntos de armadura) */
      image?: string
      /** Só aparece com estas subclasses no filtro (sem isso: aparece sempre) */
      sub?: string[]
    }

export interface Subclass {
  /** "lacaios" — usado no filtro e na URL */
  id: string
  /** "Lacaios" — igual às sugestões da ficha do mundo */
  label: string
  /** Item cujo sprite representa a subclasse */
  icon: string
  text: Text
}

/** O melhor de cada subclasse numa etapa. Sem `item` = nada bom nessa etapa (o `note` explica). */
export interface WeaponPick {
  sub: string
  item?: ClassItem
  alt?: ClassItem[]
  note?: Text
}

/** Um caminho do mapa ramificado: "se usar X, vá por aqui". */
export interface ClassPath {
  /** Único no guia inteiro (as ligações `next` usam ele) */
  id: string
  title: string
  /** Quando escolher este caminho */
  when: Text
  sub: string[]
  armor: ClassItem[]
  weapons: ClassItem[]
  extras?: ClassItem[]
  pros: Text[]
  cons: Text[]
  /** Caminhos da próxima etapa que continuam este */
  next?: string[]
}

export interface ClassStage {
  stage: StageId
  summary: Text
  /** Melhor armadura no geral e alternativas */
  armor: ClassItem
  armorAlt?: ClassItem[]
  weapons: WeaponPick[]
  accessories: ClassItem[]
  buffs: ClassItem[]
  paths: ClassPath[]
  next: {
    /** `key` de um marco de MILESTONES (título EN da wiki); vazio no fim do jogo */
    target?: string
    /** Marcos opcionais que valem a pena antes */
    optional?: { key: string; why: Text }[]
    prep: Text[]
    arena?: Text[]
  }
}

export interface ClassGuide {
  class: PlayerClass
  /** "invocador" — vai na URL */
  slug: string
  title: string
  /** Item cujo sprite representa a classe */
  emblem: string
  intro: Text
  basics: Text[]
  subclasses: Subclass[]
  /**
   * Nomes PT que ainda faltam no dicionário (ex.: conjuntos de armadura). Também estão em
   * scripts/manual-names.json: quando o dicionário for gerado de novo, o build-classes avisa para tirar daqui.
   */
  names?: Record<string, string>
  stages: ClassStage[]
  source: { page: string; revid: number; date: string }
}

/** Classes na ordem da tela, com o slug da URL (o guia só existe se houver o arquivo; veja `hasClassGuide`). */
export const CLASS_LIST: { class: PlayerClass; slug: string; emblem: string }[] = [
  { class: 'melee', slug: 'corpo-a-corpo', emblem: 'Warrior Emblem' },
  { class: 'ranged', slug: 'a-distancia', emblem: 'Ranger Emblem' },
  { class: 'magic', slug: 'mago', emblem: 'Sorcerer Emblem' },
  { class: 'summoner', slug: 'invocador', emblem: 'Summoner Emblem' },
]

const loaders = import.meta.glob<ClassGuide>('../data/classes/*.json', { import: 'default' })
const byClass = new Map(Object.entries(loaders).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), load]))

/** O guia dessa classe já foi escrito? (arquivo src/data/classes/<classe>.json) */
export const hasClassGuide = (c: PlayerClass) => byClass.has(c)

export function loadClassGuide(c: PlayerClass): Promise<ClassGuide> | null {
  return byClass.get(c)?.() ?? null
}

export const itemName = (item: ClassItem) => (typeof item === 'string' ? item : item.name)

/** O item aparece com o filtro de subclasse escolhido? */
export function matchesSub(item: ClassItem | { sub?: string[] }, sub: string | null) {
  if (!sub || typeof item === 'string' || !item.sub) return true
  return item.sub.includes(sub)
}

export type ExclusiveMode = 'expert' | 'master'

let exclusive: Promise<Record<string, ExclusiveMode>> | null = null

/** Itens exclusivos de Expert/Mestre (pela raridade na wiki), gerado por scripts/build-classes.mjs. */
export function loadExclusive() {
  exclusive ??= import('../data/exclusive-items.json').then(({ default: json }) => json as Record<string, ExclusiveMode>)
  return exclusive
}
