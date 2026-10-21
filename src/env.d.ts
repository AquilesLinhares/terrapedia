// Variáveis do arquivo .env (só as que começam com VITE_ chegam ao navegador).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Translator API do Chrome (tradução no aparelho). Ainda não vem nos tipos do TypeScript.
type TranslatorAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface TranslatorCreateMonitor extends EventTarget {
  addEventListener(type: 'downloadprogress', listener: (e: { loaded: number }) => void): void
}

interface Translator {
  translate(input: string): Promise<string>
  destroy(): void
}

declare const Translator: {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorAvailability>
  create(options: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (m: TranslatorCreateMonitor) => void
  }): Promise<Translator>
}
