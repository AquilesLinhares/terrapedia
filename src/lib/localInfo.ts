// Dados locais de um artigo (dicionário, receitas, ferramentas, NPCs): tudo vem junto com o app,
// então dá para mostrar nome PT, sprite e um "Resumo rápido" antes de a wiki responder.

import { useEffect, useState } from 'react'
import type { ArticleRef } from './library'
import { ptNameForPage } from './ptSearch'
import { craftingFor, type Crafting } from '../components/CraftingSection'
import { loadRecipeBook, spriteUrl, type RecipeBook } from './recipes'
import { loadToolsData, type ToolItem, type ToolsData } from './toolsData'
import { loadNpcData, type NpcData } from './npcs'

export interface LocalInfo {
  ref: ArticleRef
  book: RecipeBook
  tools: ToolsData | null
  npc: NpcData | null
  item: ToolItem | null
  crafting: Crafting | null
  /** NPCs que vendem o item (nomes EN) */
  vendors: string[]
  /** [fonte, chance %, modo exclusivo?] */
  drops: ToolsData['drops'][string]
  /** O app conhece esta página: vale mostrar a abertura rápida */
  known: boolean
}

/** Procura o título nos dados locais. Devolve `null` enquanto carrega (ou `undefined` se falhou). */
export function useLocalInfo(title: string) {
  const [info, setInfo] = useState<{ title: string; value: LocalInfo | undefined } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      loadRecipeBook(),
      ptNameForPage(title),
      loadToolsData().catch(() => null),
      loadNpcData().catch(() => null),
    ])
      .then(([book, pt, tools, npc]) => {
        if (!alive) return
        const item = tools?.items.get(title) ?? null
        const crafting = craftingFor(book, title)
        const vendors = tools?.vendors[title] ?? []
        const drops = tools?.drops[title] ?? []
        const sprite = spriteUrl(book, title)
        const hasSprite = book.sprites.has(title)
        const known = !!(pt || item || crafting || vendors.length || drops.length)
        const ref: ArticleRef = { page: title, en: title, pt, sprite: hasSprite ? sprite : undefined }
        setInfo({ title, value: { ref, book, tools, npc, item, crafting, vendors, drops, known } })
      })
      .catch(() => alive && setInfo({ title, value: undefined }))
    return () => {
      alive = false
    }
  }, [title])

  // Resultado de outro título (a pessoa acabou de navegar): ainda não vale
  return info && info.title === title ? info.value : null
}
