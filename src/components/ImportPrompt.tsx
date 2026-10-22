import { library, useSyncStatus, type SyncStatus } from '../lib/library'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "3 favoritos, 2 em Buscar depois e 1 grupo" */
export function describeOffer(offer: NonNullable<SyncStatus['importOffer']>) {
  const parts = [
    offer.favorites && plural(offer.favorites, 'favorito', 'favoritos'),
    offer.readLater && `${offer.readLater} em Buscar depois`,
    offer.groups && plural(offer.groups, 'grupo', 'grupos'),
    offer.quick && `${offer.quick} no acesso rápido`,
  ].filter((part): part is string => Boolean(part))
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0]
}

/** No primeiro login, oferece copiar para a conta o que estava salvo só neste aparelho. */
export default function ImportPrompt() {
  const { importOffer } = useSyncStatus()
  if (!importOffer) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="w-full max-w-md rounded-t-2xl border border-line bg-panel p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 sm:rounded-2xl sm:pb-5"
      >
        <h2 id="import-title" className="font-display text-lg font-bold text-gold">
          Trazer o que está neste aparelho?
        </h2>
        <p className="mt-2 text-sm text-muted">
          Você tem <strong className="text-ink">{describeOffer(importOffer)}</strong> salvos neste aparelho. Quer copiar
          para a sua conta? Assim eles aparecem em qualquer lugar onde você entrar.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={library.dismissImport}
            className="h-11 rounded-xl px-4 text-sm font-semibold text-muted transition hover:bg-bg/50 hover:text-ink"
          >
            Não, obrigado
          </button>
          <button
            type="button"
            onClick={library.importLocal}
            className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-bg transition hover:brightness-110"
          >
            Importar para a conta
          </button>
        </div>
      </div>
    </div>
  )
}
