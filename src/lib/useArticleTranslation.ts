// Hook que coloca um artigo em português: nomes e rótulos na hora, e o texto corrido
// com o cache compartilhado + a Translator API do Chrome (aos poucos, de cima para baixo).

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGameNames, localizeArticle, type GameNames, type Translations } from './localize'
import { fetchCachedTranslations, saveTranslations } from './translationCache'
import { createTranslator, translateSegment, translatorStatus } from './translator'

export type TranslationState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'translating'; done: number; total: number }
  /** O Chrome pode traduzir, mas precisa baixar o modelo (pedido com um clique) */
  | { kind: 'download'; progress?: number }
  /** Sem tradução automática: `missing` trechos ficam em inglês */
  | { kind: 'unavailable'; missing: number; total: number }
  | { kind: 'done'; failed: number }

// Atualiza a tela no máximo a cada 1,2s enquanto traduz (refazer o HTML a cada trecho pesaria)
const FLUSH_MS = 1200
// Salva no cache a cada tantos trechos (se a pessoa sair no meio, o que já foi feito não se perde)
const SAVE_EVERY = 40

export function useArticleTranslation(page: string | null, cleanHtml: string | null, enabled: boolean) {
  const [names, setNames] = useState<GameNames | null>(null)
  const [translations, setTranslations] = useState<{ page: string | null; map: Translations }>({ page: null, map: {} })
  const [state, setState] = useState<TranslationState>({ kind: 'idle' })
  const [downloadClicks, setDownloadClicks] = useState(0)
  const current = useRef(translations)
  current.current = translations

  useEffect(() => {
    loadGameNames().then(setNames)
  }, [])

  const segments = useMemo(() => (names && cleanHtml ? localizeArticle(cleanHtml, names).segments : []), [names, cleanHtml])
  const map = translations.page === page ? translations.map : null
  const html = useMemo(
    () => (enabled && names && cleanHtml ? localizeArticle(cleanHtml, names, map ?? {}).html : null),
    [enabled, names, cleanHtml, map],
  )

  useEffect(() => {
    if (!enabled || !page || !segments.length) {
      setState({ kind: 'idle' })
      return
    }
    let cancelled = false
    const known = current.current.page === page ? current.current.map : {}
    const merge = (more: Translations) =>
      setTranslations((prev) => ({ page, map: { ...(prev.page === page ? prev.map : {}), ...more } }))

    ;(async () => {
      setState({ kind: 'loading' })
      const cached = await fetchCachedTranslations(page)
      if (cancelled) return
      merge(cached)
      const have = { ...known, ...cached }
      const missing = segments.filter((s) => !(s.key in have))
      if (!missing.length) return setState({ kind: 'done', failed: 0 })

      const status = await translatorStatus()
      if (cancelled) return
      const needsDownload = status === 'downloadable' || status === 'downloading'
      if (needsDownload && !downloadClicks) return setState({ kind: 'download' })
      if (status !== 'available' && !needsDownload) {
        return setState({ kind: 'unavailable', missing: missing.length, total: segments.length })
      }

      let translator: Translator
      try {
        translator = await createTranslator((progress) => !cancelled && setState({ kind: 'download', progress }))
      } catch {
        if (!cancelled) setState({ kind: 'unavailable', missing: missing.length, total: segments.length })
        return
      }

      let pending: Translations = {}
      let unsaved: Translations = {}
      let failed = 0
      let lastFlush = 0
      if (!cancelled) setState({ kind: 'translating', done: 0, total: missing.length })
      for (let i = 0; i < missing.length && !cancelled; i++) {
        const segment = missing[i]
        const result = await translateSegment(translator, segment).catch(() => null)
        if (result) {
          pending[segment.key] = result
          unsaved[segment.key] = result
        } else failed++
        if (cancelled) break
        if (Date.now() - lastFlush > FLUSH_MS || i === missing.length - 1) {
          merge(pending)
          pending = {}
          lastFlush = Date.now()
          setState({ kind: 'translating', done: i + 1, total: missing.length })
        }
        if (Object.keys(unsaved).length >= SAVE_EVERY) {
          saveTranslations(page, unsaved)
          unsaved = {}
        }
      }
      // Mesmo se a pessoa saiu da página, o que já foi traduzido vai para o cache
      saveTranslations(page, { ...unsaved, ...pending })
      if (!cancelled) setState({ kind: 'done', failed })
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, page, segments, downloadClicks])

  /** Baixar o modelo do Chrome: precisa ser chamado dentro do clique. */
  function startDownload() {
    createTranslator().catch(() => undefined)
    setDownloadClicks((n) => n + 1)
  }

  return { html, state, startDownload }
}
