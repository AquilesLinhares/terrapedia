// Busca por voz (Web Speech API do navegador, grátis). Chrome, Edge e Safari têm; o Firefox não.
// Sem suporte, `voiceSupported` é false e o botão do microfone não aparece.

interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
}

const Ctor = ((window as unknown as Record<string, unknown>).SpeechRecognition ??
  (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined

export const voiceSupported = !!Ctor

/**
 * Começa a ouvir em português. `onText` recebe o texto enquanto a pessoa fala (e o final);
 * `onEnd` é chamado quando para (silêncio, erro ou `stop()`). Devolve a função que para de ouvir.
 */
export function listen(onText: (text: string, final: boolean) => void, onEnd: (error?: string) => void) {
  if (!Ctor) {
    onEnd('unsupported')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'pt-BR'
  rec.interimResults = true
  rec.maxAlternatives = 1
  let error: string | undefined
  rec.onresult = (e) => {
    const parts = Array.from(e.results)
    onText(
      parts.map((r) => r[0].transcript).join('').trim(),
      parts.every((r) => r.isFinal),
    )
  }
  rec.onerror = (e) => {
    error = e.error
  }
  rec.onend = () => onEnd(error)
  rec.start()
  return () => rec.stop()
}
