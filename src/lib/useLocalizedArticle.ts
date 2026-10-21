// Hook que coloca um artigo em português: rótulos e nomes do jogo (o texto corrido fica em inglês).

import { useEffect, useMemo, useState } from 'react'
import { loadGameNames, localizeArticle, type GameNames } from './localize'

export function useLocalizedArticle(cleanHtml: string | null, enabled: boolean) {
  const [names, setNames] = useState<GameNames | null>(null)

  useEffect(() => {
    loadGameNames().then(setNames)
  }, [])

  return useMemo(
    () => (enabled && names && cleanHtml ? localizeArticle(cleanHtml, names) : null),
    [enabled, names, cleanHtml],
  )
}
