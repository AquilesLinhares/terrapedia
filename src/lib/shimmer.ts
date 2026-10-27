// Guia do Brilho (Shimmer). Dados escritos por nós a partir das páginas "Shimmer", "Aether", "Crate" e dos itens
// (wiki, 1.4.5, lidos em 2026-10-27). Itens sempre pelo nome EN; PT e sprite vêm do dicionário/receitas.
// `check` = não deu para confirmar na wiki: a tela mostra "conferir".

import type { StageId } from './progression'

export interface Boost {
  item: string
  /** O que se joga no Brilho */
  from: string
  /** Texto do efeito (aceita [[Item]]) */
  effect: string
  /** "player" = vale por personagem; "world" = vale para o mundo */
  scope: 'player' | 'world'
  minStage?: StageId
  /** Explica o que ficou sem conferir */
  check?: string
}

export const BOOSTS: Boost[] = [
  {
    item: 'Vital Crystal',
    from: 'Life Crystal',
    scope: 'player',
    effect: 'Aumenta a regeneração de vida: o tempo de regeneração natural “anda” 20% mais rápido.',
  },
  {
    item: 'Arcane Crystal',
    from: 'Mana Crystal',
    scope: 'player',
    effect: 'Aumenta a regeneração de mana.',
    check: 'a wiki cita “1/50 do mana máximo”, mas não deixa claro o intervalo',
  },
  {
    item: 'Aegis Fruit',
    from: 'Life Fruit',
    scope: 'player',
    minStage: 'post-mech',
    effect: 'Aumenta a defesa em 4. Só entra em jogo no Modo Difícil, depois do primeiro chefe mecânico.',
  },
  {
    item: 'Ambrosia',
    from: 'Any Fruit',
    scope: 'player',
    effect: '+5% de velocidade de mineração e +5% de velocidade de colocar blocos e paredes. Serve qualquer fruta.',
  },
  {
    item: 'Galaxy Pearl',
    from: 'Pink Pearl',
    scope: 'player',
    effect: 'Aumenta a sorte em 0,03.',
  },
  {
    item: 'Gummy Worm',
    from: 'Gold Worm',
    scope: 'player',
    effect: 'Aumenta o Poder de pesca em 3. Funciona com a minhoca de ouro como item ou como bichinho (critter).',
  },
  {
    item: "Peddler's Satchel",
    from: "Peddler's Hat",
    scope: 'world',
    effect:
      'O Caixeiro-viajante passa a vender 1 item a mais. Vale para o mundo, não para o personagem. Se ele já estiver na cidade, o bônus só vale nas próximas visitas.',
  },
]

export interface Swap {
  from: string
  to: string
  note?: string
  minStage?: StageId
  check?: string
}

export interface SwapGroup {
  id: string
  title: string
  intro: string
  swaps: Swap[]
}

const chain = (names: string[]): Swap[] => names.slice(0, -1).map((from, i) => ({ from, to: names[i + 1] }))

export const SWAP_GROUPS: SwapGroup[] = [
  {
    id: 'ores',
    title: 'Ciclo de minérios (sempre para o nível de baixo)',
    intro:
      'Cada minério vira o do nível imediatamente abaixo. Serve para ter o minério básico em quantidade (Ferro e Chumbo entram em muita receita) a partir de um minério melhor. Pegue o resultado e jogue de novo para descer mais um degrau.',
    swaps: [
      ...chain([
        'Luminite',
        'Chlorophyte Ore',
        'Titanium Ore',
        'Adamantite Ore',
        'Orichalcum Ore',
        'Mythril Ore',
        'Palladium Ore',
        'Cobalt Ore',
        'Platinum Ore',
        'Gold Ore',
        'Tungsten Ore',
        'Silver Ore',
        'Lead Ore',
        'Iron Ore',
        'Tin Ore',
        'Copper Ore',
      ]),
      { from: 'Copper Ore', to: 'Clay Block', note: 'Depois: Argila → Pedra' },
      { from: 'Clay Block', to: 'Stone Block' },
    ],
  },
  {
    id: 'gems',
    title: 'Ciclo de gemas',
    intro: 'Mesma ideia dos minérios: cada gema vira a de baixo. Os coelhos e esquilos de gema (critters) viram a própria gema.',
    swaps: [...chain(['Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Topaz', 'Amethyst']), { from: 'Amethyst', to: 'Clay Block' }],
  },
  {
    id: 'crates',
    title: 'Caixas do Modo Difícil → caixas comuns',
    intro:
      'Caixa do Modo Difícil jogada no Brilho vira a versão pré-Modo Difícil do mesmo bioma. Útil quando você quer o conteúdo antigo. A lista da wiki só mostra esse sentido.',
    swaps: [
      { from: 'Pearlwood Crate', to: 'Wooden Crate' },
      { from: 'Mythril Crate', to: 'Iron Crate' },
      { from: 'Titanium Crate', to: 'Golden Crate' },
      { from: 'Bramble Crate', to: 'Jungle Crate' },
      { from: 'Azure Crate', to: 'Sky Crate' },
      { from: 'Defiled Crate', to: 'Corrupt Crate' },
      { from: 'Hematic Crate', to: 'Crimson Crate' },
      { from: 'Divine Crate', to: 'Hallowed Crate' },
      { from: 'Stockade Crate', to: 'Dungeon Crate' },
      { from: 'Boreal Crate', to: 'Frozen Crate' },
      { from: 'Mirage Crate', to: 'Oasis Crate' },
      { from: 'Hellstone Crate', to: 'Obsidian Crate' },
      { from: 'Seaside Crate', to: 'Ocean Crate' },
    ],
  },
  {
    id: 'emblems',
    title: 'Emblemas (ciclo de 4)',
    intro:
      'Os quatro emblemas formam um círculo. Útil quando a Parede de Carne dropa um emblema que não é da sua classe: jogue-o até chegar no que você quer. O Avenger Emblem, se jogado, volta a ser Warrior Emblem (mais as almas).',
    swaps: [
      { from: 'Summoner Emblem', to: 'Warrior Emblem' },
      { from: 'Warrior Emblem', to: 'Ranger Emblem' },
      { from: 'Ranger Emblem', to: 'Sorcerer Emblem' },
      { from: 'Sorcerer Emblem', to: 'Summoner Emblem' },
    ],
  },
  {
    id: 'misc',
    title: 'Outras trocas úteis',
    intro: 'Trocas especiais que valem a pena conhecer. A lista completa está na página “Shimmer” da wiki.',
    swaps: [
      { from: 'Star Cloak', to: 'Chromatic Cloak', note: 'Evita o debuff Brilhando' },
      { from: 'Any Torch', to: 'Aether Torch' },
      { from: 'Forest Pylon', to: 'Aether Pylon', note: 'Qualquer Pilone serve' },
      { from: 'Angel Statue', to: 'Aether Monolith' },
      { from: 'Slime Gun', to: 'Shimmer Gun' },
      { from: 'Fertilizer', to: 'Infused Fertilizer' },
      { from: 'Spell Tome', to: 'Advanced Combat Techniques: Volume Two', note: 'Item de mundo' },
      { from: 'Zenith', to: 'True Copper Shortsword' },
      { from: 'Axe of Regrowth', to: 'Axearang', note: 'Também dá para voltar' },
      { from: 'Rod of Discord', to: 'Rod of Harmony', minStage: 'post-moon-lord' },
      { from: 'Clentaminator', to: 'Terraformer', minStage: 'post-moon-lord' },
      { from: 'Bottomless Water Bucket', to: 'Bottomless Shimmer Bucket', minStage: 'post-moon-lord', note: 'Também dá para voltar' },
      { from: 'Purple Solution', to: 'Red Solution', minStage: 'post-moon-lord', note: 'Também dá para voltar' },
      { from: 'Lihzahrd Brick Wall', to: 'Forbidden Lihzahrd Brick Wall', minStage: 'post-golem' },
      {
        from: 'Gladiator Helmet',
        to: 'Gladiator Breastplate',
        note: 'Ciclo: elmo → peitoral → calça → elmo',
        check: 'só aparece no histórico de versões da wiki',
      },
    ],
  },
]

/** Como jogar um item no Brilho (resumo da página "Shimmer"). */
export const HOW_TO: string[] = [
  'Solte o item dentro do Brilho (jogue-o do inventário). Só vale item solto no mundo.',
  'O item transformado sobe até sair do líquido e fica flutuando, brilhando, até você pegá-lo.',
  'Item sem troca afunda como em qualquer líquido. Item criado numa bancada vira os materiais da receita (descraftar).',
  'Se a receita dá uma pilha (ex.: 5 balas), jogue a mesma quantidade para descraftar. O que passar disso fica sem mudar.',
  'Com a cabeça dentro ou com a boia da vara tocando, você ganha o debuff Brilhando (cai devagar atravessando blocos). A Chromatic Cloak evita isso; Plataformas de Aetherium sobre a poça deixam os itens passarem e você não cai.',
  'Não dá para pescar nem usar itens dentro do Brilho, nem pegá-lo com o Balde Vazio. Depois do Senhor da Lua, o Bottomless Shimmer Bucket dá Brilho sem limite.',
]

/** Como achar o Éter (Aether). */
export const AETHER = {
  intro:
    'O Éter é um minibioma que existe uma vez por mundo, no subsolo ou nas cavernas, perto da borda e sempre do mesmo lado da Selva. Tem uma poça grande de Brilho no centro, com Árvores de Gema em volta. Mundos criados antes da 1.4.4 não têm Éter.',
  steps: [
    'Veja de que lado do mundo está a Selva: o Éter fica nesse mesmo lado, na borda.',
    'Procure no subsolo ou nas cavernas. Lá o fundo escurece e aparecem estrelas coloridas.',
    'Atalho: o nome do Guia no início do mundo dá a posição horizontal na Bússola (conta abaixo). Não funciona se o Éter não coube na primeira zona de geração, nem em mundos “For the Worthy”.',
    'Para voltar depressa: um Aether Pylon (troque um Pilone qualquer no Brilho; só funciona perto do Éter de verdade) ou um Teletransportador.',
    'Antes do Senhor da Lua, o Éter é a única fonte de Brilho e não se repõe. Depois, o Bottomless Shimmer Bucket cria Brilho à vontade.',
    'Também dá para criar um Éter artificial: pelo menos 300 blocos de Brilho no subsolo ou nas cavernas.',
  ],
  formulas: [
    { size: 'Pequeno', left: '3800 − 524 × n', right: '3276 + 524 × n' },
    { size: 'Médio', left: '6000 − 1008 × n', right: '4992 + 1008 × n' },
    { size: 'Grande', left: '8000 − 1448 × n', right: '6552 + 1448 × n' },
  ],
  /** Valor de n por nome do Guia: só os primeiros, vistos na wiki; o resto fica na página "Aether". */
  guideNames: [
    ['Joe', '0'],
    ['Connor', '0,0278'],
    ['Tanner', '0,0566'],
    ['Wyatt', '0,0833'],
    ['Cody', '0,1111'],
    ['Levi', '0,1389'],
    ['Luke', '0,1667'],
    ['Jack', '0,1944'],
  ] as const,
  guideNamesCheck: 'os outros nomes do Guia não foram copiados; conferir a tabela na página “Aether”',
}

/** Quantos itens ficaram sem conferir (para o resumo no fim da tela). */
export const SHIMMER_CHECK_COUNT =
  BOOSTS.filter((b) => b.check).length + SWAP_GROUPS.flatMap((g) => g.swaps).filter((s) => s.check).length + 1
