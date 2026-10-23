import { lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { closeQuickWindow, openQuickWindow, quickWindowSupported, useQuickWindow } from '../lib/quickWindow'
import { FloatIcon } from './icons'

// O painel só é baixado quando a janelinha abre
const QuickPanel = lazy(() => import('./QuickPanel'))

/** Desenha o painel dentro da janelinha flutuante, quando ela está aberta (fica no Layout). */
export function QuickWindowHost() {
  const win = useQuickWindow()
  if (!win) return null
  return createPortal(
    <Suspense fallback={null}>
      <QuickPanel />
    </Suspense>,
    win.document.body,
  )
}

/** Botão do menu (PC): abre ou fecha a janelinha. Some no navegador sem a API. */
export function QuickWindowButton() {
  const open = !!useQuickWindow()
  if (!quickWindowSupported) return null
  return (
    <button
      type="button"
      onClick={() => (open ? closeQuickWindow() : void openQuickWindow())}
      title={open ? 'Fechar o acesso rápido' : 'Abrir acesso rápido (janelinha que fica por cima do jogo)'}
      aria-pressed={open}
      className={`flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition ${
        open ? 'bg-gold/15 text-gold' : 'text-muted hover:bg-panel hover:text-ink'
      }`}
    >
      <FloatIcon className="h-5 w-5" filled={open} />
      <span className="hidden xl:inline">Acesso rápido</span>
    </button>
  )
}

/** Página inicial: botão grande ou, sem a API, a dica de onde funciona. */
export function QuickWindowCard() {
  const open = !!useQuickWindow()
  return (
    <div className="mt-8 w-full max-w-md rounded-xl border border-line bg-panel/70 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <FloatIcon className="h-5 w-5 text-accent" />
        Acesso rápido flutuante
      </p>
      {quickWindowSupported ? (
        <>
          <p className="mt-1 text-muted">
            Uma janelinha que fica por cima do Terraria (modo janela sem bordas) com seus itens fixados, favoritos e a
            etapa do mundo.
          </p>
          <button
            type="button"
            onClick={() => (open ? closeQuickWindow() : void openQuickWindow())}
            className="mt-2 rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-bg transition hover:brightness-110 active:scale-95"
          >
            {open ? 'Fechar acesso rápido' : 'Abrir acesso rápido'}
          </button>
        </>
      ) : (
        <p className="mt-1 text-muted">
          Dica: no PC, abra a Terrapedia no <strong className="text-ink">Chrome</strong> ou no{' '}
          <strong className="text-ink">Edge</strong> para ter uma janelinha que fica por cima do jogo. Você já pode ir
          fixando páginas com o botão “Fixar”.
        </p>
      )}
    </div>
  )
}
