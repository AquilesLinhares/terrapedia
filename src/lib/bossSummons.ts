// Condições de chefes e eventos (/ferramentas/condicoes): como invocar, onde, quando acontece sozinho e o
// que precisa antes.
//
// Escrito por nós a partir das páginas de cada chefe/evento na wiki (versão 1.4.5). Itens pelo nome EN; textos
// aceitam [[Item]] e **negrito**. As receitas dos itens de invocação vêm sozinhas do recipes.json.
// Cada marco de MILESTONES (progression.ts) tem uma entrada com a mesma `key`; `EXTRA_EVENTS` são eventos
// que não contam para a etapa do mundo (Lua de Sangue, Eclipse Solar).

import type { Text } from './guides'
import { MILESTONES, type Milestone, type StageId } from './progression'

export interface SummonInfo {
  key: string
  /** Itens que invocam (o primeiro é o principal) */
  summon: { item: string; note?: Text }[]
  /** Como invocar quando não há item (ou além dele) */
  how?: Text
  where: Text
  /** Quando acontece sozinho (null = nunca) */
  natural: Text | null
  /** O que precisa antes, em texto */
  requires?: Text
  /** Etapa a partir da qual dá para fazer */
  after: StageId
  /** Chefes/eventos (keys de MILESTONES) que precisam ter sido derrotados */
  needs?: string[]
  /** Observação curta (ex.: só em mundos de Corrupção) */
  note?: Text
}

const img = (file: string) => `https://terraria.wiki.gg/images/${file}`

export const EXTRA_EVENTS: Milestone[] = [
  { key: 'Blood Moon', pt: 'Lua de Sangue', kind: 'evento', phase: 'pre', optional: true, icon: img('Bloody_Tear.png') },
  { key: 'Solar Eclipse', pt: 'Eclipse Solar', kind: 'evento', phase: 'hard', optional: true, icon: img('Solar_Tablet.png') },
]

/** Todos os chefes e eventos da ferramenta, na ordem do jogo (os extras entram perto de onde aparecem). */
export const SUMMON_LIST: Milestone[] = [
  ...MILESTONES.slice(0, 2),
  EXTRA_EVENTS[0],
  ...MILESTONES.slice(2, 14),
  EXTRA_EVENTS[1],
  ...MILESTONES.slice(14),
]

export const SUMMONS: Record<string, SummonInfo> = {
  'King Slime': {
    key: 'King Slime',
    summon: [{ item: 'Slime Crown' }],
    where: 'Na superfície, a qualquer hora.',
    natural: 'Durante uma **Chuva de Geleia**, depois de matar 150 geleias (75 se ele já foi derrotado). Às vezes aparece sozinho nas pontas do mapa.',
    after: 'start',
  },
  'Eye of Cthulhu': {
    key: 'Eye of Cthulhu',
    summon: [{ item: 'Suspicious Looking Eye' }],
    where: 'Em qualquer lugar, **só à noite**.',
    natural: 'Chance de 1 em 3 por noite quando alguém tem 200+ de vida e 10+ de defesa e ele ainda não foi derrotado. Aviso: "You feel an evil presence watching you...".',
    after: 'start',
  },
  'Blood Moon': {
    key: 'Blood Moon',
    summon: [{ item: 'Bloody Tear', note: 'cai de inimigos que só aparecem na Lua de Sangue: a primeira tem que ser natural' }],
    where: 'Em qualquer lugar, à noite.',
    natural: 'Chance de 1 em 9 por noite (fora da lua nova) quando alguém tem mais de 120 de vida. Não acontece na mesma noite que o Olho de Cthulhu vem sozinho.',
    after: 'start',
  },
  'Goblin Army': {
    key: 'Goblin Army',
    summon: [{ item: 'Goblin Battle Standard' }],
    where: 'Chega pelas bordas do mapa e anda até o ponto de nascimento.',
    natural: 'Depois de quebrar um [[Shadow Orb]] ou [[Crimson Heart]], chance todo amanhecer quando alguém tem 200+ de vida.',
    requires: 'Para o item: [[Tattered Cloth]], que os Goblins Batedores deixam cair (aparecem nas pontas do mapa).',
    after: 'start',
  },
  'Eater of Worlds': {
    key: 'Eater of Worlds',
    summon: [{ item: 'Worm Food' }],
    how: 'Ou quebre 3 [[Shadow Orb|Orbes das Sombras]] (ele vem no terceiro).',
    where: 'Na **Corrupção**, a qualquer hora.',
    natural: null,
    after: 'start',
    note: 'Só em mundos de Corrupção. Em mundo de Carmesim é o Cérebro de Cthulhu.',
  },
  'Brain of Cthulhu': {
    key: 'Brain of Cthulhu',
    summon: [{ item: 'Bloody Spine' }],
    how: 'Ou quebre 3 [[Crimson Heart|Corações Carmesim]] (ele vem no terceiro).',
    where: 'No **Carmesim**, a qualquer hora.',
    natural: null,
    after: 'start',
    note: 'Só em mundos de Carmesim. Em mundo de Corrupção é o Devorador de Mundos.',
  },
  'Queen Bee': {
    key: 'Queen Bee',
    summon: [{ item: 'Abeemination' }],
    how: 'Ou quebre a larva dentro de uma colmeia na Selva subterrânea.',
    where: 'Na **Selva**, a qualquer hora.',
    natural: null,
    after: 'start',
  },
  "Old One's Army": {
    key: "Old One's Army",
    summon: [{ item: 'Eternia Crystal', note: 'posto no [[Eternia Crystal Stand]]' }],
    where: 'Onde você montar o suporte. Defenda o cristal das ondas.',
    natural: null,
    requires: 'O [[Tavernkeep]] (chega depois do Devorador/Cérebro) vende o cristal e o suporte. Nível 2 depois de um chefe mecânico; nível 3 depois do Golem.',
    after: 'post-evil',
  },
  Skeletron: {
    key: 'Skeletron',
    summon: [{ item: 'Clothier Voodoo Doll', note: 'jogue na lava com o Alfaiate vivo (só depois de derrotá-lo uma vez)' }],
    how: 'Fale com o **Velho** na entrada da Masmorra **à noite** e escolha "Curse".',
    where: 'Na entrada da **Masmorra**, à noite.',
    natural: null,
    after: 'start',
  },
  Deerclops: {
    key: 'Deerclops',
    summon: [{ item: 'Deer Thing' }],
    where: 'No bioma de **Neve** (superfície ou gelo), a qualquer hora.',
    natural: 'À meia-noite, numa **Nevasca**, na Neve da superfície, se ainda não foi derrotado (e mais algumas condições).',
    after: 'start',
  },
  'Wall of Flesh': {
    key: 'Wall of Flesh',
    summon: [{ item: 'Guide Voodoo Doll', note: 'jogue na lava do Submundo com o Guia vivo' }],
    where: 'No **Submundo**. Ela vem de um lado e atravessa o mapa: faça uma ponte comprida.',
    natural: null,
    requires: 'Matar a parede liga o **Modo Difícil** no mundo (não tem volta).',
    after: 'start',
  },
  'Queen Slime': {
    key: 'Queen Slime',
    summon: [{ item: 'Gelatin Crystal', note: 'achado no lugar de Fragmentos de Cristal no Sagrado subterrâneo' }],
    where: 'No **Sagrado**, a qualquer hora.',
    natural: null,
    after: 'hardmode',
  },
  'Pirate Invasion': {
    key: 'Pirate Invasion',
    summon: [{ item: 'Pirate Map', note: 'cai de inimigos do Oceano no Modo Difícil' }],
    where: 'Chega pelo lado do Oceano mais perto do ponto de nascimento.',
    natural: 'No Modo Difícil, depois de quebrar um Altar Demoníaco, chance todo amanhecer.',
    after: 'hardmode',
  },
  'Frost Legion': {
    key: 'Frost Legion',
    summon: [{ item: 'Snow Globe', note: 'sai de [[Present|Presentes]] abertos num mundo no Modo Difícil' }],
    where: 'Chega pelas bordas do mapa. Precisa de 200+ de vida.',
    natural: null,
    after: 'hardmode',
  },
  'The Twins': {
    key: 'The Twins',
    summon: [{ item: 'Mechanical Eye' }],
    where: 'Em qualquer lugar, **só à noite**.',
    natural: 'No Modo Difícil, depois de quebrar um Altar Demoníaco, chance em noites aleatórias (aviso: "This is going to be a terrible night...").',
    after: 'hardmode',
  },
  'The Destroyer': {
    key: 'The Destroyer',
    summon: [{ item: 'Mechanical Worm' }],
    where: 'Em qualquer lugar, **só à noite**.',
    natural: 'No Modo Difícil, depois de quebrar um Altar Demoníaco, chance em noites aleatórias (aviso: "You feel vibrations from deep below...").',
    after: 'hardmode',
  },
  'Skeletron Prime': {
    key: 'Skeletron Prime',
    summon: [{ item: 'Mechanical Skull' }],
    where: 'Em qualquer lugar, **só à noite**.',
    natural: 'No Modo Difícil, depois de quebrar um Altar Demoníaco, chance em noites aleatórias (aviso: "The air is getting colder around you...").',
    after: 'hardmode',
  },
  'Solar Eclipse': {
    key: 'Solar Eclipse',
    summon: [{ item: 'Solar Tablet', note: 'só de dia' }],
    where: 'Na superfície, o dia todo.',
    natural: 'Depois de um chefe mecânico, chance pequena a cada amanhecer.',
    requires: 'Os [[Solar Tablet Fragment|Fragmentos]] caem de Lagartos e Cobras Voadoras no Templo da Selva (depois da Plantera).',
    after: 'post-mech',
  },
  Plantera: {
    key: 'Plantera',
    summon: [],
    how: 'Quebre um **Bulbo da Plantera** (flor rosa) na Selva subterrânea. Os bulbos só nascem depois dos três chefes mecânicos.',
    where: 'Na **Selva subterrânea**.',
    natural: null,
    after: 'post-all-mechs',
  },
  'Pumpkin Moon': {
    key: 'Pumpkin Moon',
    summon: [{ item: 'Pumpkin Moon Medallion' }],
    where: 'Em qualquer lugar, à noite (vai até o amanhecer, em 15 ondas).',
    natural: null,
    after: 'post-plantera',
  },
  'Frost Moon': {
    key: 'Frost Moon',
    summon: [{ item: 'Naughty Present' }],
    where: 'Em qualquer lugar, à noite (vai até o amanhecer, em 20 ondas).',
    natural: null,
    after: 'post-plantera',
  },
  Golem: {
    key: 'Golem',
    summon: [{ item: 'Lihzahrd Power Cell', note: 'usada no [[Lihzahrd Altar]], no fundo do Templo' }],
    where: 'No **Templo da Selva**. A porta abre com a [[Temple Key]], que a Plantera deixa cair.',
    natural: null,
    after: 'post-plantera',
    needs: ['Plantera'],
  },
  'Martian Madness': {
    key: 'Martian Madness',
    summon: [],
    how: 'Deixe uma **Sonda Marciana** fugir depois que ela te ver (sem matá-la). Ela aparece nas pontas do mapa, perto do Espaço.',
    where: 'Na superfície, onde a sonda te encontrou.',
    natural: 'A sonda só aparece depois do Golem.',
    after: 'post-golem',
    needs: ['Golem'],
  },
  'Duke Fishron': {
    key: 'Duke Fishron',
    summon: [{ item: 'Truffle Worm', note: 'use como isca e pesque' }],
    where: 'Pescando no **Oceano**.',
    natural: null,
    requires: 'A Minhoca Trufada aparece no bioma de Cogumelos Brilhantes subterrâneo, no Modo Difícil.',
    after: 'hardmode',
  },
  'Empress of Light': {
    key: 'Empress of Light',
    summon: [],
    how: 'Mate a **Libélula Prismática** que voa no Sagrado de noite.',
    where: 'No **Sagrado**, à noite. De dia ela é muito mais forte.',
    natural: null,
    requires: 'A libélula só aparece depois da Plantera.',
    after: 'post-plantera',
    needs: ['Plantera'],
  },
  'Lunatic Cultist': {
    key: 'Lunatic Cultist',
    summon: [],
    how: 'Mate os 4 cultistas que rezam na entrada da **Masmorra**.',
    where: 'Na entrada da **Masmorra**.',
    natural: 'Os cultistas aparecem sozinhos depois do Golem.',
    after: 'post-golem',
    needs: ['Golem'],
  },
  'Lunar Events': {
    key: 'Lunar Events',
    summon: [],
    how: 'Começam sozinhos ao derrotar o Cultista Lunático: 4 Colunas aparecem no mapa. Mate 100 inimigos perto de cada uma (150 no Expert/Mestre) para tirar o escudo e quebrá-la.',
    where: 'Nas 4 Colunas espalhadas pela superfície.',
    natural: 'Logo depois do Cultista Lunático.',
    after: 'post-cultist',
    needs: ['Lunatic Cultist'],
  },
  'Moon Lord': {
    key: 'Moon Lord',
    summon: [{ item: 'Celestial Sigil', note: 'feito com fragmentos das 4 Colunas' }],
    how: 'Ou espere 1 minuto depois de quebrar as 4 Colunas.',
    where: 'Em qualquer lugar.',
    natural: 'Um minuto depois de quebrar as 4 Colunas dos Eventos Lunares.',
    after: 'post-cultist',
    needs: ['Lunatic Cultist'],
  },
}
