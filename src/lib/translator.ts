// Tradução automática com a Translator API que vem dentro do Chrome (roda no aparelho, de graça).
// Só existe no Chrome para computador (versão 138+). Nos outros navegadores o app usa o cache
// compartilhado (translationCache.ts) ou mostra o texto em inglês.

import { tokensOk, type Segment } from './localize'

/**
 * - `unsupported`: o navegador não tem a API (ou ela não respondeu)
 * - `unavailable`: tem a API, mas não traduz inglês → português
 * - `downloadable`: precisa baixar o modelo (só com um clique da pessoa)
 * - `available`: pronto para traduzir
 */
export type TranslatorStatus = 'unsupported' | 'unavailable' | 'downloadable' | 'downloading' | 'available'

const LANGS = { sourceLanguage: 'en', targetLanguage: 'pt' }

/** Promessa que desiste depois de `ms` (alguns navegadores têm a API mas ela nunca responde). */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([promise, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))])
}

export async function translatorStatus(): Promise<TranslatorStatus> {
  if (typeof self === 'undefined' || !('Translator' in self)) return 'unsupported'
  try {
    const status = await withTimeout(Translator.availability(LANGS), 4000)
    return status === 'timeout' ? 'unsupported' : status
  } catch {
    return 'unsupported'
  }
}

let translator: Promise<Translator> | null = null

/**
 * Cria o tradutor (uma vez só). Se o modelo ainda não foi baixado, precisa ser chamado
 * a partir de um clique (o Chrome exige). `onProgress` recebe de 0 a 1 durante o download.
 */
export function createTranslator(onProgress?: (fraction: number) => void): Promise<Translator> {
  translator ??= Translator.create({
    ...LANGS,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded))
    },
  }).catch((err) => {
    translator = null
    throw err
  })
  return translator
}

/**
 * Traduz um trecho mantendo os marcadores [0], [1]... Se o tradutor estragar algum marcador,
 * tenta de novo com o formato {0}; se ainda falhar, devolve null (o trecho fica em inglês).
 */
export async function translateSegment(t: Translator, segment: Segment): Promise<string | null> {
  const first = await t.translate(segment.text)
  if (tokensOk(first, segment.tokens)) return first
  if (!segment.tokens) return first
  const curly = segment.text.replace(/\[(\d+)\]/g, '{$1}')
  const second = (await t.translate(curly)).replace(/\{\s*(\d+)\s*\}/g, '[$1]')
  return tokensOk(second, segment.tokens) ? second : null
}
