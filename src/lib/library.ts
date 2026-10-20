// "Biblioteca" do usuário: favoritos, grupos e a lista "buscar depois".
//
// Por enquanto tudo fica salvo só neste aparelho (localStorage). O formato foi pensado para
// virar tabelas no Supabase depois, sem mudar as telas:
//   favorites   (page, en, pt, sprite, added_at)
//   read_later  (page, en, pt, sprite, added_at, seen)
//   groups      (id, name, created_at)
//   group_items (group_id, page, en, pt, sprite, added_at)
// Todas as mudanças passam por `library.*` → `commit()`. Para sincronizar, basta trocar o
// `LibraryBackend` (ou mandar cada mudança para o Supabase dentro de `commit`).

import { useSyncExternalStore } from 'react'

/** O mínimo que precisamos saber de um artigo para mostrá-lo numa lista. */
export interface ArticleRef {
  /** Título da página na wiki em inglês (é o "id" do artigo) */
  page: string
  en: string
  /** Nome em português, quando existe no dicionário */
  pt?: string
  /** Endereço do sprite/imagem principal */
  sprite?: string
}

export interface SavedArticle extends ArticleRef {
  addedAt: string
}

export interface ReadLaterItem extends SavedArticle {
  seen: boolean
}

export interface Group {
  id: string
  name: string
  createdAt: string
  items: SavedArticle[]
}

export interface LibraryData {
  version: 1
  favorites: SavedArticle[]
  readLater: ReadLaterItem[]
  groups: Group[]
}

const EMPTY: LibraryData = { version: 1, favorites: [], readLater: [], groups: [] }

/** Onde os dados ficam guardados. Hoje: localStorage. Amanhã: Supabase. */
export interface LibraryBackend {
  load(): LibraryData
  save(data: LibraryData): void
  /** Avisa quando os dados mudaram por fora (ex.: outra aba aberta) */
  onExternalChange?(callback: () => void): void
}

const STORAGE_KEY = 'terrapedia:library'

const localBackend: LibraryBackend = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return EMPTY
      return { ...EMPTY, ...(JSON.parse(raw) as Partial<LibraryData>), version: 1 }
    } catch {
      return EMPTY // navegador sem localStorage (modo privado) ou dado corrompido
    }
  },
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // sem espaço ou bloqueado: a mudança vale até fechar a página
    }
  },
  onExternalChange(callback) {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) callback()
    })
  },
}

const backend: LibraryBackend = localBackend
let data = backend.load()
const listeners = new Set<() => void>()

function commit(next: LibraryData) {
  data = next
  backend.save(data)
  listeners.forEach((listener) => listener())
}

backend.onExternalChange?.(() => {
  data = backend.load()
  listeners.forEach((listener) => listener())
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Lê a biblioteca e redesenha o componente sempre que ela muda. */
export function useLibrary() {
  return useSyncExternalStore(subscribe, () => data)
}

const now = () => new Date().toISOString()
const samePage = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

function newId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/** Atualiza nome PT / sprite de um item salvo, se agora sabemos mais sobre ele. */
function refresh<T extends ArticleRef>(item: T, ref: ArticleRef): T {
  return samePage(item.page, ref.page) ? { ...item, ...ref, pt: ref.pt ?? item.pt, sprite: ref.sprite ?? item.sprite } : item
}

export function isFavorite(lib: LibraryData, page: string) {
  return lib.favorites.some((f) => samePage(f.page, page))
}

export function readLaterItem(lib: LibraryData, page: string) {
  return lib.readLater.find((r) => samePage(r.page, page))
}

export function groupHas(group: Group, page: string) {
  return group.items.some((i) => samePage(i.page, page))
}

// Todas as ações que mudam a biblioteca.
export const library = {
  toggleFavorite(ref: ArticleRef) {
    commit({
      ...data,
      favorites: isFavorite(data, ref.page)
        ? data.favorites.filter((f) => !samePage(f.page, ref.page))
        : [{ ...ref, addedAt: now() }, ...data.favorites],
    })
  },

  toggleReadLater(ref: ArticleRef) {
    commit({
      ...data,
      readLater: readLaterItem(data, ref.page)
        ? data.readLater.filter((r) => !samePage(r.page, ref.page))
        : [{ ...ref, addedAt: now(), seen: false }, ...data.readLater],
    })
  },

  setSeen(page: string, seen: boolean) {
    commit({ ...data, readLater: data.readLater.map((r) => (samePage(r.page, page) ? { ...r, seen } : r)) })
  },

  clearSeen() {
    commit({ ...data, readLater: data.readLater.filter((r) => !r.seen) })
  },

  /** Cria um grupo e devolve o id dele. */
  createGroup(name: string) {
    const id = newId()
    commit({ ...data, groups: [...data.groups, { id, name: name.trim(), createdAt: now(), items: [] }] })
    return id
  },

  renameGroup(id: string, name: string) {
    commit({ ...data, groups: data.groups.map((g) => (g.id === id ? { ...g, name: name.trim() } : g)) })
  },

  deleteGroup(id: string) {
    commit({ ...data, groups: data.groups.filter((g) => g.id !== id) })
  },

  toggleInGroup(id: string, ref: ArticleRef) {
    commit({
      ...data,
      groups: data.groups.map((g) => {
        if (g.id !== id) return g
        return groupHas(g, ref.page)
          ? { ...g, items: g.items.filter((i) => !samePage(i.page, ref.page)) }
          : { ...g, items: [...g.items, { ...ref, addedAt: now() }] }
      }),
    })
  },

  /** Chamado ao abrir um artigo: atualiza nome PT e sprite onde ele estiver salvo. */
  refreshArticle(ref: ArticleRef) {
    const next: LibraryData = {
      ...data,
      favorites: data.favorites.map((f) => refresh(f, ref)),
      readLater: data.readLater.map((r) => refresh(r, ref)),
      groups: data.groups.map((g) => ({ ...g, items: g.items.map((i) => refresh(i, ref)) })),
    }
    if (JSON.stringify(next) !== JSON.stringify(data)) commit(next)
  },
}
