// Modo construtor: paletas prontas por estilo.
//
// Cada paleta é uma lista de itens (nome EN) com uma quantidade sugerida. Só entram itens que existem
// no dicionário E nas receitas; o resto é descartado (e fica em `discarded`, para conferir). Nenhum nome
// novo é criado aqui: a paleta é só um atalho para a lista de materiais do Modo construtor.

import { useEffect, useState } from 'react'
import { loadDictionary } from './ptSearch'
import { isGroup, treeRecipes, type RecipeBook } from './recipes'

export interface PaletteItem {
  name: string
  qty: number
}

export interface Palette {
  id: string
  title: string
  text: string
  /** Item do dicionário usado como ícone */
  icon: string
  items: PaletteItem[]
}

const i = (name: string, qty: number): PaletteItem => ({ name, qty })

// Candidatos. Os que não existirem nos dados são descartados na hora de montar (veja `usePalettes`).
const CANDIDATES: Palette[] = [
  {
    id: 'madeira',
    title: 'Casa de madeira',
    text: 'O básico de uma casa de NPC: madeira, parede, plataformas, mobília e tochas.',
    icon: 'Wood',
    items: [i('Wood', 200), i('Wood Wall', 400), i('Wood Platform', 50), i('Wooden Door', 2), i('Wooden Chair', 1), i('Wooden Table', 1), i('Wooden Bookcase', 1), i('Wood Chandelier', 1), i('Torch', 10)],
  },
  {
    id: 'boreal',
    title: 'Cabana boreal',
    text: 'Madeira boreal para a casa na neve.',
    icon: 'Boreal Wood',
    items: [i('Boreal Wood', 200), i('Boreal Wood Wall', 400), i('Boreal Wood Platform', 50), i('Boreal Wood Door', 2), i('Boreal Wood Chair', 1), i('Boreal Wood Table', 1), i('Boreal Wood Lantern', 2), i('Torch', 10)],
  },
  {
    id: 'gotico',
    title: 'Pedra e gótico',
    text: 'Tijolos cinza, obsidiana e ebonstone, com mobília gótica e lustre de ferro.',
    icon: 'Gray Brick',
    items: [
      i('Stone Block', 200),
      i('Stone Wall', 400),
      i('Gray Brick', 200),
      i('Gray Brick Wall', 400),
      i('Obsidian Brick', 100),
      i('Obsidian Brick Wall', 200),
      i('Ebonstone Brick', 100),
      i('Ebonstone Brick Wall', 200),
      i('Gothic Chair', 1),
      i('Gothic Table', 1),
      i('Gothic Bookcase', 1),
      i('Iron Chandelier', 1),
      i('Candle', 2),
    ],
  },
  {
    id: 'vidro',
    title: 'Vidro e iluminação',
    text: 'Estufa e salão envidraçados: vidro, parede e plataforma de vidro, lustres, lanternas e lâmpadas.',
    icon: 'Glass',
    items: [
      i('Glass', 200),
      i('Glass Wall', 400),
      i('Glass Block', 100),
      i('Glass Platform', 50),
      i('Glass Door', 2),
      i('Glass Chair', 1),
      i('Glass Table', 1),
      i('Glass Bookcase', 1),
      i('Glass Chandelier', 2),
      i('Glass Lantern', 2),
      i('Glass Lamp', 2),
      i('Glass Candle', 2),
      i('Lamp Post', 2),
      i('Torch', 10),
    ],
  },
  {
    id: 'dinastia',
    title: 'Dinastia',
    text: 'Estilo oriental: madeira dinastia, telhas azuis e vermelhas, lâmpadas e lanternas.',
    icon: 'Dynasty Wood',
    items: [i('Dynasty Wood', 200), i('Dynasty Wall', 400), i('Dynasty Wood Platform', 50), i('Blue Dynasty Shingles', 100), i('Red Dynasty Shingles', 100), i('Blue Dynasty Wall', 200), i('Dynasty Lamp', 2), i('Dynasty Lantern', 2)],
  },
  {
    id: 'marmore-granito',
    title: 'Mármore e granito',
    text: 'Blocos e paredes de mármore e granito, os biomas de caverna.',
    icon: 'Marble Block',
    items: [i('Marble Block', 200), i('Marble Wall', 400), i('Granite Block', 200), i('Granite Wall', 400)],
  },
  {
    id: 'madeiras',
    title: 'Madeiras do mundo',
    text: 'Uma parede de cada madeira de bioma: Mogno, Ébano, Sombra, Pérola, Palmeira e Assustadora.',
    icon: 'Rich Mahogany',
    items: [
      i('Rich Mahogany', 100),
      i('Rich Mahogany Wall', 200),
      i('Rich Mahogany Platform', 50),
      i('Ebonwood', 100),
      i('Ebonwood Wall', 200),
      i('Ebonwood Platform', 50),
      i('Shadewood', 100),
      i('Shadewood Wall', 200),
      i('Pearlwood', 100),
      i('Pearlwood Wall', 200),
      i('Palm Wood', 100),
      i('Palm Wood Wall', 200),
      i('Spooky Wood', 100),
      i('Spooky Wood Wall', 200),
    ],
  },
  {
    id: 'gelo-neve',
    title: 'Neve e gelo',
    text: 'Tijolos de neve e de gelo e seus blocos.',
    icon: 'Ice Brick',
    items: [i('Snow Block', 200), i('Snow Brick', 200), i('Snow Brick Wall', 400), i('Ice Block', 100), i('Ice Brick', 200), i('Ice Brick Wall', 400)],
  },
  {
    id: 'inferno',
    title: 'Inferno',
    text: 'Para uma base no Submundo: obsidiana, tijolos de Hellstone e de lama.',
    icon: 'Hellstone Brick',
    items: [i('Obsidian Brick', 200), i('Obsidian Brick Wall', 400), i('Obsidian Platform', 50), i('Hellstone Brick', 200), i('Hellstone Brick Wall', 400), i('Mudstone Block', 100), i('Mudstone Brick', 200), i('Mudstone Brick Wall', 400)],
  },
  {
    id: 'ceu',
    title: 'Céu e sol',
    text: 'Bloco e parede de Sunplate, nuvem e lanterna de coração.',
    icon: 'Sunplate Block',
    items: [i('Sunplate Block', 200), i('Disc Wall', 400), i('Sunplate Wall', 400), i('Cloud Block', 100), i('Heart Lantern', 2)],
  },
]

export interface PalettesResult {
  palettes: Palette[]
  /** Itens descartados por não existirem no dicionário e/ou nas receitas: [paleta, item, motivo] */
  discarded: { palette: string; name: string; why: string }[]
  /** Itens mantidos mas sem receita nos dados (aparecem como "conferir") */
  check: { palette: string; name: string }[]
}

/** Paletas já filtradas pelos dados. */
export async function buildPalettes(book: RecipeBook): Promise<PalettesResult> {
  const dict = await loadDictionary()
  const inDict = new Set(dict.map((e) => e.en))
  const inRecipes = (n: string) => book.byResult.has(n) || book.byIngredient.has(n)
  const palettes: Palette[] = []
  const discarded: PalettesResult['discarded'] = []
  const check: PalettesResult['check'] = []
  for (const p of CANDIDATES) {
    const items: PaletteItem[] = []
    for (const it of p.items) {
      const missing = [!inDict.has(it.name) && 'dicionário', !inRecipes(it.name) && 'receitas'].filter(Boolean)
      if (missing.length || isGroup(it.name)) {
        discarded.push({ palette: p.id, name: it.name, why: `fora de: ${missing.join(' e ')}` })
        continue
      }
      items.push(it)
      if (treeRecipes(book, it.name).length === 0) check.push({ palette: p.id, name: it.name })
    }
    if (items.length > 0 && inDict.has(p.icon)) palettes.push({ ...p, items })
  }
  return { palettes, discarded, check }
}

/** Hook: paletas filtradas (ou null enquanto carregam). */
export function usePalettes(book: RecipeBook | null) {
  const [value, setValue] = useState<PalettesResult | null>(null)
  useEffect(() => {
    if (!book) return
    let alive = true
    buildPalettes(book).then((r) => alive && setValue(r))
    return () => {
      alive = false
    }
  }, [book])
  return value
}
