// Histórico: as últimas 30 páginas abertas, só neste aparelho (localStorage `terrapedia:history`).
// Telas leem com `useRecent()`; o ArticlePage chama `recent.add()` quando o artigo carrega.

import { useSyncExternalStore } from 'react'
import type { ArticleRef } from './library'

export interface RecentPage extends ArticleRef {
  /** Quando foi aberta (ISO) */
  at: string
}

const KEY = 'terrapedia:history'
const MAX = 30

function read(): RecentPage[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

let current = read()
const listeners = new Set<() => void>()

function save(list: RecentPage[]) {
  current = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Sem espaço ou localStorage bloqueado: o histórico vale só até fechar o app
  }
  listeners.forEach((l) => l())
}

// Outra aba do app mudou o histórico
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  current = read()
  listeners.forEach((l) => l())
})

export function useRecent() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export const recent = {
  /** Põe a página no topo (sem repetir). Se já estava, mantém o nome PT/sprite que faltarem. */
  add(ref: ArticleRef) {
    const old = current.find((p) => p.page === ref.page)
    const entry: RecentPage = { ...old, ...ref, pt: ref.pt ?? old?.pt, sprite: ref.sprite ?? old?.sprite, at: new Date().toISOString() }
    save([entry, ...current.filter((p) => p.page !== ref.page)].slice(0, MAX))
  },
  remove(page: string) {
    save(current.filter((p) => p.page !== page))
  },
  clear() {
    save([])
  },
}
