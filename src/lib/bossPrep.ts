// Preparação por chefe: buffs (Checklist de buffs) e arena (Planejador de arena).
//
// Escrito por nós a partir das páginas dos chefes e dos guias da wiki (Guide:Arenas, páginas de cada chefe),
// na versão atual do jogo (1.4.5). Itens sempre pelo nome EN (o PT vem do dicionário); textos aceitam
// [[Item]] e **negrito**, como as páginas reorganizadas.
//
// `from` / `until`: etapa em que o item passa a valer / deixa de valer (fica uma versão melhor). A lista de
// cada chefe usa a etapa em que ele costuma ser enfrentado (`fight`).

import type { Text } from './guides'
import { STAGES, type StageId } from './progression'
import type { PlayerClass } from './world'

export interface PrepItem {
  name: string
  /** Para que serve, curto */
  note?: Text
  from?: StageId
  /** Some a partir desta etapa (troca por uma versão melhor) */
  until?: StageId
  /** Precisa ter derrotado (key de MILESTONES) */
  needs?: string
  /** Só para esta classe */
  class?: PlayerClass
}

export interface BuffGroup {
  id: string
  title: string
  items: PrepItem[]
}

export const BUFF_GROUPS: BuffGroup[] = [
  {
    id: 'potions',
    title: 'Poções (todas as classes)',
    items: [
      { name: 'Ironskin Potion', note: '+8 de defesa' },
      { name: 'Regeneration Potion', note: 'regenera vida' },
      { name: 'Swiftness Potion', note: '+25% de velocidade' },
      { name: 'Endurance Potion', note: '−10% de dano recebido' },
      { name: 'Heartreach Potion', note: 'pega corações de mais longe' },
      { name: 'Lifeforce Potion', note: '+20% de vida máxima', from: 'hardmode' },
      { name: 'Wrath Potion', note: '+10% de dano' },
      { name: 'Rage Potion', note: '+10% de crítico (soma com a Ira)' },
    ],
  },
  {
    id: 'class',
    title: 'Da sua classe',
    items: [
      { name: 'Flask of Poison', note: 'armas corpo a corpo envenenam', class: 'melee', needs: 'Queen Bee', until: 'post-evil' },
      { name: 'Flask of Fire', note: 'armas corpo a corpo queimam', class: 'melee', from: 'post-evil', needs: 'Queen Bee', until: 'hardmode' },
      { name: 'Flask of Ichor', note: 'baixa a defesa do alvo (mundo de Carmesim)', class: 'melee', from: 'hardmode' },
      { name: 'Flask of Cursed Flames', note: 'fogo amaldiçoado (mundo de Corrupção)', class: 'melee', from: 'hardmode' },
      { name: 'Sharpening Station', note: 'penetração de armadura no corpo a corpo', class: 'melee' },
      { name: 'Archery Potion', note: 'flechas mais fortes (só arcos)', class: 'ranged' },
      { name: 'Ammo Reservation Potion', note: '20% de chance de não gastar munição', class: 'ranged' },
      { name: 'Ammo Box', note: 'mais 20% de chance de não gastar munição', class: 'ranged', from: 'hardmode' },
      { name: 'Magic Power Potion', note: '+20% de dano mágico', class: 'magic' },
      { name: 'Mana Regeneration Potion', note: 'mana volta mais rápido', class: 'magic' },
      { name: 'Crystal Ball', note: 'mais mana e dano mágico', class: 'magic', from: 'hardmode' },
      { name: 'Summoning Potion', note: '+1 lacaio', class: 'summoner' },
      { name: 'Bewitching Table', note: '+1 lacaio', class: 'summoner', from: 'post-skeletron' },
      { name: 'War Table', note: '+1 sentinela', class: 'summoner', from: 'post-evil', needs: "Old One's Army" },
    ],
  },
  {
    id: 'food',
    title: 'Comida e cura',
    items: [
      { name: 'Bowl of Soup', note: 'Muito Satisfeito; [[Golden Delight]] dá o nível mais alto' },
      { name: 'Lesser Healing Potion', until: 'post-eye' },
      { name: 'Healing Potion', from: 'post-eye', until: 'hardmode' },
      { name: 'Greater Healing Potion', from: 'hardmode', until: 'post-cultist' },
      { name: 'Super Healing Potion', from: 'post-cultist' },
      { name: 'Lesser Mana Potion', class: 'magic', until: 'post-eye' },
      { name: 'Mana Potion', class: 'magic', from: 'post-eye', until: 'hardmode' },
      { name: 'Greater Mana Potion', class: 'magic', from: 'hardmode', until: 'post-cultist' },
      { name: 'Super Mana Potion', class: 'magic', from: 'post-cultist' },
    ],
  },
  {
    id: 'arena',
    title: 'Estações e buffs de arena',
    items: [
      { name: 'Campfire', note: 'regenera vida perto dela' },
      { name: 'Heart Lantern', note: 'regenera vida perto dela' },
      { name: 'Star in a Bottle', note: 'regenera mana (bom para magos)' },
      { name: 'Honey Bucket', note: 'uma poça de mel regenera vida' },
      { name: 'Sunflower', note: '+velocidade e menos inimigos' },
      { name: 'Bast Statue', note: '+5 de defesa perto dela' },
      { name: 'Slice of Cake', note: '+20% de velocidade (Festeira vende)' },
    ],
  },
]

export interface ArenaPlan {
  /** O que construir/levar */
  build: PrepItem[]
  /** Tamanho sugerido */
  size: Text
  tips: Text[]
}

export interface BossPrep {
  /** key de MILESTONES */
  key: string
  /** Etapa em que costuma ser enfrentado */
  fight: StageId
  /** Buffs a mais só para este chefe */
  extra?: PrepItem[]
  arena: ArenaPlan
}

// Peças que aparecem em quase toda arena
const PLATFORMS: PrepItem = { name: 'Wood Platform', note: 'camadas para pular e desviar' }
const CAMPFIRE: PrepItem = { name: 'Campfire', note: 'no meio da arena' }
const LANTERN: PrepItem = { name: 'Heart Lantern', note: 'no meio da arena' }
const STAR: PrepItem = { name: 'Star in a Bottle', note: 'se você usa magia' }
const HONEY: PrepItem = { name: 'Honey Bucket', note: 'poça de mel embaixo das plataformas' }
const HOOK: PrepItem = { name: 'Grappling Hook', note: 'ou um gancho melhor, para fugir rápido' }
const NURSE: PrepItem = { name: 'Nurse', note: 'casa da Enfermeira perto da arena', from: 'post-eye' }
const ASPHALT: PrepItem = { name: 'Asphalt Block', note: 'chão de asfalto: corre muito mais rápido', from: 'hardmode' }
const BASIC = [PLATFORMS, CAMPFIRE, LANTERN, STAR, HONEY, HOOK]

export const BOSS_PREP: BossPrep[] = [
  {
    key: 'King Slime',
    fight: 'start',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HOOK],
      size: '~100 blocos de largura na superfície, com 1–2 camadas de plataformas a ~8 blocos do chão.',
      tips: [
        'Ele pula atrás de você: suba nas plataformas quando ele pular e passe por baixo quando ele cair.',
        'Os slimes pequenos que saem dele dão pouco trabalho, mas não deixe acumular.',
        'Chame com a [[Slime Crown]] na superfície; se você se afastar muito, ele vai embora.',
      ],
    },
  },
  {
    key: 'Eye of Cthulhu',
    fight: 'start',
    arena: {
      build: BASIC,
      size: '~150 blocos de largura e 3 camadas de plataformas, ~10 blocos entre elas, na superfície.',
      tips: [
        'Só à noite. Na segunda fase ele avança direto em você: pule ou suba uma camada na hora da investida.',
        'Mate os [[Servant of Cthulhu|Servos de Cthulhu]] com arma que atravessa (ex.: flechas de fogo ou [[Jester\'s Arrow]]).',
        'Armas de longo alcance ajudam muito: ele quase nunca fica parado.',
      ],
    },
  },
  {
    key: 'Eater of Worlds',
    fight: 'post-eye',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HOOK],
      size: 'Uma faixa de ~150 blocos aberta em cima de um abismo da Corrupção, com 2 camadas de plataformas.',
      tips: [
        'Precisa estar na Corrupção. Ele se divide quando você acerta o meio: armas que atravessam ou explodem são as melhores ([[Vilethorn]], granadas, [[Jester\'s Arrow]]).',
        'Fique em cima: ele sai da terra por baixo e você vê de onde vem.',
        'Os pedaços soltam corações quando morrem: aproveite para curar.',
      ],
    },
  },
  {
    key: 'Brain of Cthulhu',
    fight: 'post-eye',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HOOK],
      size: '~120 blocos de largura limpos no Carmesim (subterrâneo ou superfície), com 2 camadas de plataformas.',
      tips: [
        'Ele não leva dano enquanto houver [[Creeper|Rastejadores]] girando em volta: mate-os primeiro.',
        'Na segunda fase ele se teleporta e cria cópias falsas; a verdadeira é a única que leva dano.',
        'Armas que atravessam várias vezes limpam os Rastejadores rápido.',
      ],
    },
  },
  {
    key: 'Queen Bee',
    fight: 'post-eye',
    arena: {
      build: [PLATFORMS, HONEY, CAMPFIRE, LANTERN, HOOK],
      size: 'Um espaço de ~100×40 blocos aberto na Selva, com 2–3 camadas de plataformas e uma poça de mel embaixo.',
      tips: [
        'Ela investe na horizontal: fique uma camada acima ou abaixo da linha dela.',
        'Quando ela para e solta abelhas, é a hora de atacar; armas que atravessam acabam com as abelhas.',
        'A [[Abeemination]] só funciona na Selva.',
      ],
    },
  },
  {
    key: 'Skeletron',
    fight: 'post-evil',
    arena: {
      build: BASIC,
      size: '~150 blocos de largura perto da entrada da Masmorra, com 3 camadas de plataformas.',
      tips: [
        'Mire na cabeça: as mãos não precisam morrer.',
        'Quando ele começa a girar, corra para o lado e desvie; ele só para de girar depois de um tempo.',
        'Se o dia nascer ele fica fortíssimo: comece logo no começo da noite.',
      ],
    },
  },
  {
    key: 'Deerclops',
    fight: 'post-evil',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HOOK],
      size: '~120 blocos de largura na Tundra, com 2 camadas de plataformas a ~6 blocos do chão.',
      tips: [
        'Os espinhos de gelo correm pelo chão: fique nas plataformas e pule quando vierem.',
        'Leve luz: as mãos de sombra só aparecem quando está escuro em volta de você.',
        'Use a [[Deer Thing]] na Tundra para chamá-lo.',
      ],
    },
  },
  {
    key: 'Wall of Flesh',
    fight: 'post-skeletron',
    extra: [{ name: 'Obsidian Skin Potion', note: 'não leva dano da lava se cair da ponte' }],
    arena: {
      build: [
        { name: 'Wood Platform', note: 'ou bloco de pedra: uma ponte reta' },
        CAMPFIRE,
        LANTERN,
        { name: 'Obsidian Skin Potion', note: 'cair na lava não é o fim' },
      ],
      size: 'Uma ponte reta de ~800 blocos (o ideal é atravessar o Submundo de um lado ao outro), um pouco acima da lava.',
      tips: [
        'Ela anda devagar atrás de você: vá recuando pela ponte enquanto atira.',
        'Mate os [[The Hungry|Famintos]] que saem dela, e não se afaste demais: a língua dela puxa você de volta.',
        'Fogueiras e lanternas no caminho da ponte, não só num ponto: você vai andar muito.',
        'Depois dela o mundo entra no **Modo Difícil**.',
      ],
    },
  },
  {
    key: 'Queen Slime',
    fight: 'hardmode',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, STAR, HOOK, ASPHALT],
      size: '~200 blocos de largura na superfície, com 3 camadas de plataformas.',
      tips: [
        'Na segunda fase ela voa: armas que miram sozinhas ou lacaios ajudam.',
        'Os slimes de cristal dela pulam alto: mate antes que encham a arena.',
      ],
    },
  },
  {
    key: 'The Twins',
    fight: 'hardmode',
    arena: {
      build: [...BASIC, ASPHALT, NURSE],
      size: '~300 blocos de largura e 3–4 camadas de plataformas, 12–15 blocos entre elas.',
      tips: [
        'Só à noite. Concentre num olho de cada vez; muitos preferem derrubar o [[Retinazer]] (laser) primeiro.',
        'Corra para os lados no chão de asfalto: os tiros dos dois ficam para trás.',
        'O [[Spazmatism]] na segunda fase cospe fogo de perto: não fique embaixo dele.',
      ],
    },
  },
  {
    key: 'The Destroyer',
    fight: 'hardmode',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, STAR, HOOK, NURSE],
      size: 'Uma linha longa de plataformas (~300 blocos) bem alta no céu ou acima da superfície.',
      tips: [
        'Só à noite. Armas que atravessam ou acertam vários pedaços são as melhores ([[Daedalus Stormbow]] com flechas sagradas, por exemplo).',
        'Fique acima dele: o corpo passa por baixo das plataformas e você acerta muitos pedaços.',
        'As sondas que saem dele soltam corações: bom para curar.',
      ],
    },
  },
  {
    key: 'Skeletron Prime',
    fight: 'hardmode',
    arena: {
      build: [...BASIC, ASPHALT, NURSE],
      size: '~300 blocos de largura e 3–4 camadas de plataformas, 12–15 blocos entre elas.',
      tips: [
        'Só à noite. Mire na cabeça; derrubar antes a serra e o laser deixa a luta mais calma, mas demora mais.',
        'Quando ele gira, corra para o lado: ele fica muito rápido nessa hora.',
        'Se o dia nascer ele fica fortíssimo.',
      ],
    },
  },
  {
    key: 'Plantera',
    fight: 'post-all-mechs',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HONEY, HOOK, NURSE],
      size: 'Um espaço de ~100×100 blocos aberto na Selva Subterrânea, ou um túnel longo e reto para correr.',
      tips: [
        'Precisa ficar na Selva Subterrânea: fora dela ela fica furiosa.',
        'Limpe a grama da Selva dentro da arena para não aparecerem inimigos no meio da luta.',
        'Na segunda fase ela fica bem mais rápida: armas que atravessam limpam os tentáculos.',
      ],
    },
  },
  {
    key: 'Golem',
    fight: 'post-plantera',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, STAR, HOOK],
      size: 'A sala do Golem no Templo: tire as armadilhas e coloque 2–3 camadas de plataformas.',
      tips: [
        'Precisa ser dentro do Templo, no [[Lihzahrd Altar]] (com a [[Lihzahrd Power Cell]]).',
        'Derrube a cabeça primeiro; depois ela sai voando e solta lasers enquanto você ataca o corpo.',
        'Quebre as armadilhas de lança e de dardo da sala antes de chamar.',
      ],
    },
  },
  {
    key: 'Duke Fishron',
    fight: 'post-plantera',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, HONEY, HOOK, ASPHALT],
      size: '~300 blocos de largura no céu acima do Oceano, com 3 camadas de plataformas.',
      tips: [
        'Chame pescando com a [[Truffle Worm]] no Oceano; fora do Oceano ele fica furioso.',
        'Ele investe várias vezes seguidas: desvie para cima ou para baixo, não para os lados.',
        'No Expert/Mestre há uma terceira fase com a tela escura: velocidade e um bom gancho salvam.',
      ],
    },
  },
  {
    key: 'Empress of Light',
    fight: 'post-plantera',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, STAR, HOOK, ASPHALT],
      size: '~300 blocos de largura no Consagrado, com 3–4 camadas de plataformas e chão de asfalto.',
      tips: [
        'Lute **só à noite**: de dia ela mata em um golpe.',
        'Chame matando uma [[Prismatic Lacewing]] no Consagrado, à noite.',
        'Chão de asfalto e asas rápidas: quase todo ataque dela se desvia correndo.',
      ],
    },
  },
  {
    key: 'Lunatic Cultist',
    fight: 'post-golem',
    arena: {
      build: [PLATFORMS, CAMPFIRE, LANTERN, STAR, HOOK],
      size: 'Pequena: 2 camadas de plataformas ao lado da entrada da Masmorra.',
      tips: [
        'Ele aparece quando você mata os cultistas na entrada da Masmorra.',
        'Quando ele cria cópias, mire com cuidado: acertar uma falsa faz aparecer um inimigo.',
        'Depois dele vêm os Eventos Lunares (os pilares) e, no fim, o Senhor da Lua.',
      ],
    },
  },
  {
    key: 'Moon Lord',
    fight: 'post-cultist',
    arena: {
      build: [...BASIC, ASPHALT, NURSE, { name: 'Minecart Track', note: 'trilho longo para fugir dos raios' }],
      size: 'Bem grande: ~400 blocos de largura e 4 camadas de plataformas (ou trilho de vagonete).',
      tips: [
        'Primeiro os olhos das mãos, depois o da testa; o coração só abre no fim.',
        'O raio da testa é o que mais mata: quando ele mirar, corra para o lado.',
        'Use a arma mais forte de cada etapa: a luta é longa, leve todas as poções.',
      ],
    },
  },
]

/** O item vale na etapa? (sem `from` = desde o começo; `until` = some a partir dali) */
export function inStage(item: PrepItem, stage: StageId) {
  const i = STAGES.findIndex((s) => s.id === stage)
  const from = item.from ? STAGES.findIndex((s) => s.id === item.from) : 0
  const until = item.until ? STAGES.findIndex((s) => s.id === item.until) : Infinity
  return i >= from && i < until
}

export const bossPrep = (key: string) => BOSS_PREP.find((b) => b.key === key)
