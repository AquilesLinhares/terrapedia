// Idioma preferido para os artigos completos da wiki: português (padrão) ou o original em inglês.
// Fica salvo no aparelho.

import { useState } from 'react'

export type ArticleLang = 'pt' | 'en'

const KEY = 'terrapedia:article-lang'

function read(): ArticleLang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'pt'
  } catch {
    return 'pt'
  }
}

export function useArticleLang() {
  const [lang, setLang] = useState<ArticleLang>(read)
  function change(next: ArticleLang) {
    setLang(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // sem localStorage (aba anônima): vale só nesta tela
    }
  }
  return [lang, change] as const
}
