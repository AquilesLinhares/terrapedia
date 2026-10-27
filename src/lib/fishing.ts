// Dados da ferramenta Pescaria. Escritos por nós a partir das páginas "Fishing", "Fishing catches", "Potion fish", "Quest fish",
// "Crate" e "Angler" da Terraria Wiki (1.4.5, lidas em 2026-10-27). Itens sempre pelo nome EN; PT e sprite vêm do dicionário/receitas.
// O que cai de cada caixa (com chance) vem em tempo de execução da tabela `drops` de tools-data.json. `check` = não confirmado: mostra "conferir".

import type { StageId } from './progression'

export const FISHING_SOURCE_DATE = '27/10/2026'

export type BiomeId =
  | 'forest'
  | 'sky'
  | 'lava'
  | 'honey'
  | 'corruption'
  | 'crimson'
  | 'hallow'
  | 'snow'
  | 'jungle'
  | 'ocean'
  | 'desert'
  | 'glowing'
  | 'dungeon'
  | 'any'

export const BIOMES: Record<BiomeId, string> = {
  forest: 'Floresta pura',
  sky: 'Céu (lagos flutuantes)',
  lava: 'Lava',
  honey: 'Mel',
  corruption: 'Corrupção',
  crimson: 'Carmesim',
  hallow: 'Sagrado',
  snow: 'Neve / Gelo',
  jungle: 'Selva',
  ocean: 'Oceano',
  desert: 'Deserto',
  glowing: 'Cogumelos Brilhantes',
  dungeon: 'Masmorra',
  any: 'Qualquer bioma',
}

// ---------- Peixes de poção ----------

export interface PotionFish {
  fish: string
  biome: BiomeId
  /** Camada da boia onde pode ser pescado */
  layers: string
  /** Poções e comidas feitas com ele (nomes EN) */
  makes: string[]
  note?: string
}

export const POTION_FISH: PotionFish[] = [
  { fish: 'Double Cod', biome: 'jungle', layers: 'Céu e Superfície', makes: ['Ammo Reservation Potion'] },
  { fish: 'Variegated Lardfish', biome: 'jungle', layers: 'Subsolo e abaixo', makes: ['Summoning Potion'] },
  { fish: 'Damselfish', biome: 'sky', layers: 'Céu', makes: ['Calming Potion'] },
  { fish: 'Armored Cavefish', biome: 'forest', layers: 'Subsolo e abaixo', makes: ['Endurance Potion'], note: 'Floresta pura' },
  { fish: 'Stinkfish', biome: 'forest', layers: 'Subsolo e abaixo', makes: ['Stink Potion'], note: 'Floresta pura' },
  { fish: 'Crimson Tigerfish', biome: 'crimson', layers: 'Qualquer camada', makes: ['Heartreach Potion'] },
  { fish: 'Hemopiranha', biome: 'crimson', layers: 'Qualquer camada', makes: ['Rage Potion'] },
  { fish: 'Ebonkoi', biome: 'corruption', layers: 'Qualquer camada', makes: ['Wrath Potion'] },
  { fish: 'Flarefin Koi', biome: 'lava', layers: 'Qualquer camada', makes: ['Inferno Potion'] },
  { fish: 'Obsidifish', biome: 'lava', layers: 'Qualquer camada', makes: ['Inferno Potion', 'Potion of Return'] },
  { fish: 'Prismite', biome: 'hallow', layers: 'Qualquer camada', makes: ['Lifeforce Potion'] },
  { fish: 'Princess Fish', biome: 'hallow', layers: 'Qualquer camada', makes: ['Love Potion'] },
  { fish: 'Chaos Fish', biome: 'hallow', layers: 'Subsolo e abaixo', makes: ['Teleportation Potion'] },
  { fish: 'Frost Minnow', biome: 'snow', layers: 'Qualquer camada', makes: ['Warmth Potion'] },
  {
    fish: 'Specular Fish',
    biome: 'snow',
    layers: 'Subsolo e abaixo',
    makes: ['Wormhole Potion', 'Recall Potion'],
    note: 'Também sai na Floresta pura (subsolo e abaixo), com 1/4 de chance',
  },
]

/** Comidas feitas com peixes comuns (qualquer um da lista serve). O Seafood Dinner usa qualquer peixe de poção. */
export const FOOD_FISH = [
  { food: 'Cooked Fish', fish: ['Bass', 'Trout', 'Atlantic Cod'], where: 'Panela de cozinha' },
  { food: 'Sashimi', fish: ['Red Snapper', 'Flounder', 'Salmon', 'Tuna'], where: 'Bancada de trabalho' },
]

// ---------- Peixes de missão do Pescador ----------

export interface QuestFish {
  fish: string
  biome: BiomeId
  layers: string
  /** Só depois do Modo Difícil */
  hardmode?: boolean
  /** Biome "puro" (sem outro bioma por perto) */
  pure?: boolean
  note?: string
  check?: string
}

const BOSS_CHECK =
  'a wiki diz “depois de derrotar King Slime, Olho de Cthulhu, Devorador/Cérebro, Abelha Rainha, Esqueletron ou Parede de Carne”, sem deixar claro se é um ou todos'

export const QUEST_FISH: QuestFish[] = [
  { fish: 'Amanita Fungifin', biome: 'glowing', layers: 'Qualquer camada' },
  { fish: 'Angelfish', biome: 'sky', layers: 'Céu', pure: true, check: BOSS_CHECK },
  { fish: 'Cloudfish', biome: 'sky', layers: 'Céu', pure: true, check: BOSS_CHECK },
  { fish: 'Fallen Starfish', biome: 'sky', layers: 'Céu e Superfície', pure: true },
  { fish: 'Harpyfish', biome: 'sky', layers: 'Céu e Superfície', pure: true },
  { fish: 'The Fish of Cthulhu', biome: 'sky', layers: 'Céu e Superfície', pure: true },
  { fish: 'Wyverntail', biome: 'sky', layers: 'Céu', pure: true, hardmode: true },
  { fish: 'Bunnyfish', biome: 'forest', layers: 'Superfície', pure: true },
  { fish: 'Slimefish', biome: 'forest', layers: 'Superfície', pure: true },
  { fish: 'Zombie Fish', biome: 'forest', layers: 'Superfície', pure: true },
  { fish: 'Dynamite Fish', biome: 'forest', layers: 'Superfície', pure: true },
  { fish: 'Dirtfish', biome: 'forest', layers: 'Superfície e Subsolo', pure: true },
  { fish: 'Batfish', biome: 'forest', layers: 'Subsolo e abaixo', pure: true },
  { fish: 'Bonefish', biome: 'forest', layers: 'Subsolo e abaixo', pure: true },
  { fish: 'Jewelfish', biome: 'forest', layers: 'Subsolo e abaixo', pure: true },
  { fish: 'Spiderfish', biome: 'forest', layers: 'Subsolo e abaixo', pure: true },
  { fish: 'Demonic Hellfish', biome: 'forest', layers: 'Cavernas e abaixo', pure: true },
  { fish: 'Fishotron', biome: 'forest', layers: 'Cavernas e abaixo', pure: true },
  { fish: 'Guide Voodoo Fish', biome: 'forest', layers: 'Cavernas e abaixo', pure: true },
  { fish: 'Hungerfish', biome: 'forest', layers: 'Cavernas e abaixo', pure: true, hardmode: true },
  { fish: 'Bumblebee Tuna', biome: 'honey', layers: 'Qualquer camada', note: 'Pescado no Mel' },
  { fish: 'Catfish', biome: 'jungle', layers: 'Superfície' },
  { fish: 'Tropical Barracuda', biome: 'jungle', layers: 'Superfície' },
  { fish: 'Mudfish', biome: 'jungle', layers: 'Qualquer camada' },
  { fish: 'Derpfish', biome: 'jungle', layers: 'Superfície', hardmode: true },
  { fish: 'Clownfish', biome: 'ocean', layers: 'Céu e Superfície' },
  { fish: "Cap'n Tunabeard", biome: 'ocean', layers: 'Céu e Superfície', hardmode: true },
  { fish: 'Eater of Plankton', biome: 'corruption', layers: 'Qualquer camada' },
  { fish: 'Infected Scabbardfish', biome: 'corruption', layers: 'Qualquer camada' },
  { fish: 'Cursedfish', biome: 'corruption', layers: 'Qualquer camada', hardmode: true },
  { fish: 'Bloody Manowar', biome: 'crimson', layers: 'Qualquer camada' },
  { fish: 'Ichorfish', biome: 'crimson', layers: 'Qualquer camada', hardmode: true },
  { fish: 'Pixiefish', biome: 'hallow', layers: 'Céu e Superfície', hardmode: true },
  { fish: 'Unicorn Fish', biome: 'hallow', layers: 'Qualquer camada', hardmode: true },
  { fish: 'Mirage Fish', biome: 'hallow', layers: 'Subsolo e Cavernas', hardmode: true },
  { fish: 'Pengfish', biome: 'snow', layers: 'Céu e Superfície' },
  { fish: 'Tundra Trout', biome: 'snow', layers: 'Superfície' },
  { fish: 'Mutant Flinxfin', biome: 'snow', layers: 'Subsolo e abaixo' },
  { fish: 'Fishron', biome: 'snow', layers: 'Subsolo e abaixo', hardmode: true },
  { fish: 'Scarab Fish', biome: 'desert', layers: 'Qualquer camada' },
  { fish: 'Scorpio Fish', biome: 'desert', layers: 'Qualquer camada' },
]

// ---------- Caixas ----------

export interface Crate {
  /** Versão antes do Modo Difícil */
  pre: string
  /** Versão do Modo Difícil */
  hard: string
  /** Preço de venda, texto pronto */
  sell: string
  biome: BiomeId
  rarity: string
  /** Itens que só saem de caixas (nota da wiki) */
  exclusive?: { item: string; only?: 'pre' | 'hard' }[]
  /** Outros materiais citados pela wiki para a caixa do Modo Difícil */
  hardExtra?: string[]
}

export const CRATES: Crate[] = [
  {
    pre: 'Wooden Crate',
    hard: 'Pearlwood Crate',
    sell: '10 pratas',
    biome: 'any',
    rarity: 'Abundante (a mais comum)',
    exclusive: [{ item: 'Sailfish Boots' }, { item: 'Tsunami in a Bottle' }, { item: 'Anchor', only: 'hard' }, { item: 'Enchanted Sundial', only: 'hard' }],
  },
  {
    pre: 'Iron Crate',
    hard: 'Mythril Crate',
    sell: '50 pratas',
    biome: 'any',
    rarity: 'Incomum',
    exclusive: [
      { item: 'Beguiling Lyre' },
      { item: 'Falcon Blade' },
      { item: 'Ginger Beard' },
      { item: 'Sailfish Boots' },
      { item: 'Tsunami in a Bottle' },
      { item: 'Enchanted Sundial', only: 'hard' },
    ],
  },
  {
    pre: 'Golden Crate',
    hard: 'Titanium Crate',
    sell: '2 ouros',
    biome: 'any',
    rarity: 'Muito rara',
    exclusive: [{ item: 'Hardy Saddle' }, { item: 'Enchanted Sundial', only: 'hard' }],
  },
  { pre: 'Jungle Crate', hard: 'Bramble Crate', sell: '1 ouro', biome: 'jungle', rarity: 'Rara' },
  { pre: 'Sky Crate', hard: 'Azure Crate', sell: '1 ouro', biome: 'sky', rarity: 'Rara' },
  {
    pre: 'Corrupt Crate',
    hard: 'Defiled Crate',
    sell: '1 ouro',
    biome: 'corruption',
    rarity: 'Rara',
    hardExtra: ['Cursed Flame', 'Soul of Night'],
  },
  {
    pre: 'Crimson Crate',
    hard: 'Hematic Crate',
    sell: '1 ouro',
    biome: 'crimson',
    rarity: 'Rara',
    hardExtra: ['Ichor', 'Soul of Night'],
  },
  {
    pre: 'Hallowed Crate',
    hard: 'Divine Crate',
    sell: '1 ouro',
    biome: 'hallow',
    rarity: 'Rara',
    hardExtra: ['Crystal Shard', 'Soul of Light'],
  },
  { pre: 'Dungeon Crate', hard: 'Stockade Crate', sell: '1 ouro', biome: 'dungeon', rarity: 'Rara' },
  { pre: 'Frozen Crate', hard: 'Boreal Crate', sell: '1 ouro', biome: 'snow', rarity: 'Rara' },
  {
    pre: 'Oasis Crate',
    hard: 'Mirage Crate',
    sell: '1 ouro',
    biome: 'desert',
    rarity: 'Rara',
    exclusive: [{ item: 'Scarab Fishing Rod' }],
  },
  { pre: 'Obsidian Crate', hard: 'Hellstone Crate', sell: '1 ouro', biome: 'lava', rarity: 'Abundante (só pescando na lava)' },
  { pre: 'Ocean Crate', hard: 'Seaside Crate', sell: '1 ouro', biome: 'ocean', rarity: 'Rara' },
]

/** Caixas para as quais a tabela de drops do app não traz itens (conferir na página da caixa). */
export const CRATES_WITHOUT_DATA = ['Hallowed Crate', 'Divine Crate', 'Dungeon Crate', 'Stockade Crate']

export const CRATE_FACTS: string[] = [
  'Em média, 1 a cada 10 pescarias é uma caixa; com a Crate Potion, 1 a cada 4.',
  'O tipo da caixa depende do Poder de pesca: quanto maior, mais chance das mais raras.',
  'Caixas de bioma só saem naquele bioma (menos a Obsidian/Hellstone, que vem da lava). Em biomas misturados só sai um tipo de caixa.',
  'Caixa nunca vem vazia, e o conteúdo vale mais do que a própria caixa. A sorte do jogador não muda o que sai.',
  'Minérios e barras dentro da caixa sobem de nível com a caixa; a caixa pode dar um minério que o seu mundo não tem (ex.: Cobre num mundo de Estanho).',
  'Para trocar uma caixa do Modo Difícil pela versão antiga, jogue-a no Brilho (veja o Guia do Brilho).',
]

// ---------- Prioridade de bioma e camadas ----------

export const BIOME_PRIORITY: { biome: string; note?: string }[] = [
  { biome: 'Lava', note: 'na lava, só saem pescas da lava' },
  { biome: 'Mel', note: 'no mel, só saem pescas do mel' },
  { biome: 'Masmorra' },
  { biome: 'Corrupção / Carmesim', note: 'nos dois ao mesmo tempo: 50% cada' },
  { biome: 'Sagrado' },
  { biome: 'Cogumelos Brilhantes' },
  { biome: 'Neve / Selva', note: 'nos dois ao mesmo tempo: 50% cada (fora caixas)' },
  { biome: 'Oceano', note: 'vale a posição da boia, acima da superfície' },
  { biome: 'Deserto / Oásis' },
  { biome: 'Floresta: Céu, depois Subsolo/Cavernas, depois Superfície', note: 'precisa ser “puro”, sem outro bioma sobreposto' },
]

export const FISHING_LAYERS: { layer: string; where: string }[] = [
  { layer: 'Céu', where: 'boia acima de metade da altura da superfície' },
  { layer: 'Superfície', where: 'entre essa metade e o nível 0 do medidor de profundidade' },
  { layer: 'Subsolo', where: 'camada do Subsolo' },
  { layer: 'Cavernas', where: 'do topo das Cavernas até 300 blocos acima do fundo do mundo' },
  { layer: 'Submundo', where: 'a 300 blocos ou menos do fundo do mundo' },
]

// ---------- Recompensas do Pescador ----------

export interface FixedReward {
  quest: number
  item: string
  note?: string
}

export const ANGLER_FIXED: FixedReward[] = [
  { quest: 5, item: 'Fuzzy Carrot' },
  { quest: 10, item: 'Angler Hat' },
  { quest: 15, item: 'Angler Vest' },
  { quest: 20, item: 'Angler Pants' },
  { quest: 25, item: 'Bottomless Water Bucket' },
  { quest: 30, item: 'Golden Fishing Rod' },
]

export interface RandomReward {
  item: string
  /** Chance base, como na wiki ("1/70") */
  chance: string
  /** A partir de qual missão pode sair */
  fromQuest?: number
  minStage?: StageId
  note?: string
}

export const ANGLER_RANDOM: RandomReward[] = [
  { item: 'Golden Fishing Rod', chance: '1/250', fromQuest: 76 },
  { item: 'Hotline Fishing Hook', chance: '1/100', fromQuest: 26, minStage: 'hardmode' },
  { item: 'Fin Wings', chance: '1/70', fromQuest: 11, minStage: 'hardmode' },
  { item: 'Bottomless Water Bucket', chance: '1/70', fromQuest: 11 },
  { item: 'Super Absorbant Sponge', chance: '1/70', fromQuest: 11 },
  { item: 'Golden Bug Net', chance: '1/80' },
  { item: 'Fish Hook', chance: '1/60' },
  { item: 'Minecarp', chance: '1/60' },
]

export const ANGLER_ACCESSORIES = [
  'High Test Fishing Line',
  'Angler Earring',
  'Tackle Box',
  "Fisherman's Pocket Guide",
  'Weather Radio',
  'Sextant',
  'Fishing Bobber',
]

export const ANGLER_POTIONS = ['Fishing Potion', 'Sonar Potion', 'Crate Potion']

export const ANGLER_DECORATIONS = [
  'Life Preserver',
  "Ship's Wheel",
  'Compass Rose',
  'Wall Anchor',
  "Pillagin' Me Pixels",
  'Treasure Map',
  'Goldfish Trophy',
  'Bunnyfish Trophy',
  'Swordfish Trophy',
  'Sharkteeth Trophy',
  'Ship in a Bottle',
  'Seaweed Planter',
  'Not So Lost In Paradise',
  'Crustography',
  'Fangs',
  'What Lurks Below',
  'Couch Gag',
  'Silent Fish',
  'The Duke',
]

export const ANGLER_FACTS: string[] = [
  'Só uma missão por dia (nova às 4:30 da manhã do jogo). O peixe só pode ser pescado enquanto a missão vale e se você ainda não o tem no inventário.',
  'Falar com o Pescador entregando o peixe tira 1 do inventário e dá a recompensa.',
  'Toda missão dá moedas: de 1 prata a 10 ouros, crescendo com o número de missões; o dobro no Modo Difícil, e o dobro de novo em Expert ou mais.',
  'As chances das recompensas aleatórias caem conforme você completa missões e sobem se o Pescador está feliz. A sorte não influencia.',
  'Os 7 acessórios da lista abaixo só saem se você ainda não tem o acessório (ou uma melhoria dele).',
  'Se for o Bumblebee Tuna: sai o Bottomless Honey Bucket ou a Honey Absorbant Sponge (no pré-Modo Difícil, 50% de chance de pular esse prêmio).',
  'Se nada mais saiu: 2 a 5 poções de pesca.',
]

/** Quantos itens ficaram sem conferir (para o resumo no fim da tela). */
export const FISHING_CHECK_COUNT = QUEST_FISH.filter((q) => q.check).length + CRATES_WITHOUT_DATA.length
