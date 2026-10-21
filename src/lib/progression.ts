// Progressão do jogo: chefes e eventos em ordem, e a "etapa atual" de um mundo.
//
// O progresso de um mundo (tabela world_progress) guarda só a `key` de cada marco derrotado, que é o
// título EN da página na wiki. A etapa é calculada aqui a partir disso. Os ids das etapas (`StageId`)
// são fixos e estão em ordem: guias de classe podem dizer "a partir de post-skeletron" e usar
// `stageAtLeast(etapa, 'post-skeletron')`.

export type Phase = 'pre' | 'hard'

export interface Milestone {
  /** Título EN da página da wiki (é o que fica salvo no banco) */
  key: string
  pt: string
  kind: 'chefe' | 'evento'
  phase: Phase
  /** Dá para zerar o jogo sem ele */
  optional?: boolean
  icon: string
}

const img = (file: string) => `https://terraria.wiki.gg/images/${file}`

// Na ordem em que costumam ser enfrentados
export const MILESTONES: Milestone[] = [
  { key: 'King Slime', pt: 'Rei Geleia', kind: 'chefe', phase: 'pre', optional: true, icon: img('Map_Icon_King_Slime.png') },
  { key: 'Eye of Cthulhu', pt: 'Olho de Cthulhu', kind: 'chefe', phase: 'pre', icon: img('Map_Icon_Eye_of_Cthulhu_(first_form).png') },
  { key: 'Goblin Army', pt: 'Exército Goblin', kind: 'evento', phase: 'pre', optional: true, icon: img('Goblin_Battle_Standard.png') },
  { key: 'Eater of Worlds', pt: 'Devorador de Mundos', kind: 'chefe', phase: 'pre', icon: img('Map_Icon_Eater_of_Worlds.png') },
  { key: 'Brain of Cthulhu', pt: 'Cérebro de Cthulhu', kind: 'chefe', phase: 'pre', icon: img('Map_Icon_Brain_of_Cthulhu.png') },
  { key: 'Queen Bee', pt: 'Abelha Rainha', kind: 'chefe', phase: 'pre', optional: true, icon: img('Map_Icon_Queen_Bee.png') },
  { key: "Old One's Army", pt: 'Exército do Ancião', kind: 'evento', phase: 'pre', optional: true, icon: img('Eternia_Crystal.png') },
  { key: 'Skeletron', pt: 'Esqueletron', kind: 'chefe', phase: 'pre', icon: img('Map_Icon_Skeletron.png') },
  { key: 'Deerclops', pt: 'Cervídeo', kind: 'chefe', phase: 'pre', optional: true, icon: img('Map_Icon_Deerclops.png') },
  { key: 'Wall of Flesh', pt: 'Parede de Carne', kind: 'chefe', phase: 'pre', icon: img('Map_Icon_Wall_of_Flesh.png') },

  { key: 'Queen Slime', pt: 'Rainha Geleia', kind: 'chefe', phase: 'hard', optional: true, icon: img('Map_Icon_Queen_Slime.png') },
  { key: 'Pirate Invasion', pt: 'Invasão Pirata', kind: 'evento', phase: 'hard', optional: true, icon: img('Pirate_Map.png') },
  { key: 'Frost Legion', pt: 'Legião Congelada', kind: 'evento', phase: 'hard', optional: true, icon: img('Snow_Globe.png') },
  { key: 'The Twins', pt: 'Os Gêmeos', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Twins_(combined).png') },
  { key: 'The Destroyer', pt: 'O Destruidor', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_The_Destroyer.png') },
  { key: 'Skeletron Prime', pt: 'Esqueletron Alfa', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Skeletron_Prime.png') },
  { key: 'Plantera', pt: 'Plantera', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Plantera_(first_form).png') },
  { key: 'Pumpkin Moon', pt: 'Lua de Abóbora', kind: 'evento', phase: 'hard', optional: true, icon: img('Pumpkin_Moon_Medallion.png') },
  { key: 'Frost Moon', pt: 'Lua Congelada', kind: 'evento', phase: 'hard', optional: true, icon: img('Naughty_Present.png') },
  { key: 'Golem', pt: 'Golem', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Golem.png') },
  { key: 'Martian Madness', pt: 'Invasão Marciana', kind: 'evento', phase: 'hard', optional: true, icon: img('Map_Icon_Martian_Saucer.png') },
  { key: 'Duke Fishron', pt: 'Duque Peixe-dragão', kind: 'chefe', phase: 'hard', optional: true, icon: img('Map_Icon_Duke_Fishron.png') },
  { key: 'Empress of Light', pt: 'Imperatriz da Luz', kind: 'chefe', phase: 'hard', optional: true, icon: img('Map_Icon_Empress_of_Light.png') },
  { key: 'Lunatic Cultist', pt: 'Cultista Lunático', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Lunatic_Cultist.png') },
  { key: 'Lunar Events', pt: 'Eventos Lunares', kind: 'evento', phase: 'hard', icon: img('Map_Icon_Solar_Pillar.png') },
  { key: 'Moon Lord', pt: 'Senhor da Lua', kind: 'chefe', phase: 'hard', icon: img('Map_Icon_Moon_Lord.png') },
]

export const milestone = (key: string) => MILESTONES.find((m) => m.key === key)

export type StageId =
  | 'start'
  | 'post-eye'
  | 'post-evil'
  | 'post-skeletron'
  | 'hardmode'
  | 'post-mech'
  | 'post-all-mechs'
  | 'post-plantera'
  | 'post-golem'
  | 'post-cultist'
  | 'post-moon-lord'

export interface Stage {
  id: StageId
  /** Como aparece na tela: "pós-Esqueletron" */
  label: string
  phase: Phase
  reached: (done: Set<string>) => boolean
}

const MECHS = ['The Twins', 'The Destroyer', 'Skeletron Prime']

// Em ordem. A etapa atual é a última cuja condição já foi cumprida.
export const STAGES: Stage[] = [
  { id: 'start', label: 'Começo do mundo', phase: 'pre', reached: () => true },
  { id: 'post-eye', label: 'pós-Olho de Cthulhu', phase: 'pre', reached: (d) => d.has('Eye of Cthulhu') },
  {
    id: 'post-evil',
    label: 'pós-Devorador/Cérebro',
    phase: 'pre',
    reached: (d) => d.has('Eater of Worlds') || d.has('Brain of Cthulhu'),
  },
  { id: 'post-skeletron', label: 'pós-Esqueletron', phase: 'pre', reached: (d) => d.has('Skeletron') },
  { id: 'hardmode', label: 'Modo Difícil', phase: 'hard', reached: (d) => d.has('Wall of Flesh') },
  { id: 'post-mech', label: 'pós-1º mecânico', phase: 'hard', reached: (d) => MECHS.some((k) => d.has(k)) },
  { id: 'post-all-mechs', label: 'pós-mecânicos', phase: 'hard', reached: (d) => MECHS.every((k) => d.has(k)) },
  { id: 'post-plantera', label: 'pós-Plantera', phase: 'hard', reached: (d) => d.has('Plantera') },
  { id: 'post-golem', label: 'pós-Golem', phase: 'hard', reached: (d) => d.has('Golem') },
  { id: 'post-cultist', label: 'pós-Cultista Lunático', phase: 'hard', reached: (d) => d.has('Lunatic Cultist') },
  { id: 'post-moon-lord', label: 'pós-Senhor da Lua', phase: 'hard', reached: (d) => d.has('Moon Lord') },
]

/** Etapa atual a partir das keys derrotadas. */
export function currentStage(done: Iterable<string>): Stage {
  const set = new Set(done)
  return STAGES.reduce((best, stage) => (stage.reached(set) ? stage : best), STAGES[0])
}

/** `true` se a etapa `current` é igual ou depois de `min` (para guias: "a partir de..."). */
export function stageAtLeast(current: StageId, min: StageId) {
  return STAGES.findIndex((s) => s.id === current) >= STAGES.findIndex((s) => s.id === min)
}
