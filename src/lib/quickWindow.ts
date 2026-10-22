// Janelinha flutuante "Acesso rápido": fica por cima de tudo (até do Terraria em janela sem bordas).
//
// Usa a Document Picture-in-Picture API (Chrome/Edge no PC). A janela só pode ser aberta por um clique
// do usuário. Ela é um documento vazio: copiamos os estilos do app para lá e o React desenha o painel
// dentro dela com um portal (`QuickWindowHost` no Layout). Por ser o mesmo app, o painel usa a mesma
// biblioteca e o mesmo roteador: clicar num item abre a página na janela principal.
// O tamanho que a pessoa deixou fica salvo em `terrapedia:quick-size`.

import { useSyncExternalStore } from 'react'

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

/** O navegador tem a API (Chrome/Edge 116+ no PC). No celular e no Firefox/Safari não tem. */
export const quickWindowSupported = 'documentPictureInPicture' in window

const SIZE_KEY = 'terrapedia:quick-size'
const DEFAULT_SIZE = { width: 320, height: 480 }

let current: Window | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function readSize() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null') as { width: number; height: number } | null
    if (!saved) return DEFAULT_SIZE
    // Limites para um tamanho salvo estranho não abrir uma janela enorme ou minúscula
    return {
      width: Math.min(Math.max(Math.round(saved.width), 240), 720),
      height: Math.min(Math.max(Math.round(saved.height), 220), 1200),
    }
  } catch {
    return DEFAULT_SIZE
  }
}

function saveSize(win: Window) {
  if (!win.innerWidth || !win.innerHeight) return // janela já fechando
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify({ width: win.innerWidth, height: win.innerHeight }))
  } catch {
    // sem localStorage: volta ao tamanho padrão na próxima vez
  }
}

/** Copia os estilos do app (Tailwind e fontes) para o documento da janelinha. */
function copyStyles(target: Document) {
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = target.createElement('style')
      style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n')
      target.head.append(style)
    } catch {
      // Folha de outro site (Google Fonts): o navegador não deixa ler as regras, então liga o mesmo endereço
      if (!sheet.href) continue
      const link = target.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      target.head.append(link)
    }
  }
}

/** Abre a janelinha (precisa ser chamado num clique). Se já está aberta, só traz para a frente. */
export async function openQuickWindow() {
  const api = window.documentPictureInPicture
  if (!api) return
  if (current) return current.focus()
  let win: Window
  try {
    win = await api.requestWindow(readSize())
  } catch (error) {
    // Ex.: navegador embutido em outro app, ou janela aberta sem clique
    console.warn('Terrapedia: não abriu o acesso rápido', error)
    alert('O navegador não deixou abrir a janelinha. Tente pelo Chrome ou Edge no PC.')
    return
  }
  const doc = win.document
  doc.documentElement.lang = 'pt-BR'
  doc.documentElement.classList.add('quick-window')
  doc.title = 'Acesso rápido · Terrapedia'
  copyStyles(doc)

  let timer = 0
  win.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = window.setTimeout(() => saveSize(win), 400)
  })
  win.addEventListener('pagehide', () => {
    saveSize(win)
    if (current === win) current = null
    emit()
  })
  current = win
  emit()
}

export function closeQuickWindow() {
  current?.close()
}

/** A janelinha aberta agora (ou null). */
export function useQuickWindow() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
