import { useRegisterSW } from 'virtual:pwa-register/react'

// Avisa quando há uma versão nova do app. Só recarrega quando a pessoa toca em "Atualizar".
export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      // Confere se saiu versão nova ao voltar para o app e a cada hora com ele aberto
      const check = () => void reg.update().catch(() => {})
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
      setInterval(check, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div role="status" className="border-b border-gold/40 bg-gold/10 px-4 py-2 text-center text-sm text-gold">
      Nova versão do Terrapedia disponível.{' '}
      <button type="button" onClick={() => void updateServiceWorker(true)} className="font-semibold underline hover:text-white">
        Atualizar
      </button>
    </div>
  )
}
