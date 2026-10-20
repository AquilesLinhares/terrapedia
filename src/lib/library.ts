// "Biblioteca" do usuário: favoritos, grupos e a lista "buscar depois".
//
// Dois modos, e as telas não sabem a diferença (leem com `useLibrary()`, mudam com `library.*`):
//   - sem login: tudo fica só neste aparelho (localStorage, chave `terrapedia:library`);
//   - com login: os dados são da conta no Supabase (tabelas favorites, read_later, groups e
//     group_items — veja supabase/schema.sql). Uma cópia fica no aparelho para abrir rápido e
//     funcionar sem internet.
// Toda mudança passa por `commit()`. Logado, ele chama `work()`, que envia ao Supabase só o que
// mudou desde o último estado que o servidor confirmou (`synced`). Se falhar (sem internet), as
// mudanças ficam guardadas e vão quando a conexão voltar ou o app for reaberto.

import { useSyncExternalStore } from 'react'
import { onUserChange } from './auth'
import { fetchLibrary, pushChanges } from './librarySync'

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

export interface SyncStatus {
  /** local = sem login · loading = lendo a conta · syncing = enviando · synced = tudo salvo · offline = falhou, tenta depois */
  state: 'local' | 'loading' | 'syncing' | 'synced' | 'offline'
  /** O que há neste aparelho para importar na conta (aparece só no primeiro login) */
  importOffer: { favorites: number; readLater: number; groups: number } | null
}

/** Cópia da conta guardada no aparelho: os dados atuais e o último estado confirmado pelo servidor. */
interface CloudCache {
  data: LibraryData
  synced: LibraryData
}

const LOCAL_KEY = 'terrapedia:library'
const cloudKey = (userId: string) => `terrapedia:cloud:${userId}`
const importAskedKey = (userId: string) => `terrapedia:import-asked:${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null // navegador sem localStorage (modo privado) ou dado corrompido
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem espaço ou bloqueado: a mudança vale até fechar a página
  }
}

const loadLocal = (): LibraryData => ({ ...EMPTY, ...read<Partial<LibraryData>>(LOCAL_KEY), version: 1 })

let userId: string | null = null
let data = loadLocal()
/** Logado: o último estado que o servidor confirmou. A diferença para `data` é o que falta enviar. */
let synced = EMPTY
let status: SyncStatus = { state: 'local', importOffer: null }
/** Muda a cada login/logout, para ignorar respostas que chegaram atrasadas da conta anterior. */
let generation = 0
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())
const saveCloudCache = () => userId && write(cloudKey(userId), { data, synced } satisfies CloudCache)

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  emit()
}

function commit(next: LibraryData) {
  data = next
  if (userId) {
    saveCloudCache()
    void work()
  } else {
    write(LOCAL_KEY, data)
  }
  emit()
}

let running: number | null = null
let fetchPending = false

/**
 * Envia as mudanças pendentes e, se `fetchPending`, lê a versão do servidor.
 * Só roda uma vez por vez: chamadas no meio do caminho são percebidas pelo laço.
 */
async function work() {
  const gen = generation
  const uid = userId
  if (!uid || running === gen) return
  running = gen
  try {
    while (gen === generation) {
      if (data !== synced) {
        const target = data
        if (status.state !== 'loading') setStatus({ state: 'syncing' })
        await pushChanges(uid, synced, target)
        if (gen !== generation) return
        synced = target
        saveCloudCache()
      } else if (fetchPending) {
        fetchPending = false
        const server = await fetchLibrary()
        if (gen !== generation) return
        if (data === synced) {
          data = synced = server
          saveCloudCache()
          emit()
          checkImportOffer()
        } else {
          fetchPending = true // mudou algo enquanto lia: envia primeiro e lê de novo
        }
      } else {
        break
      }
    }
    setStatus({ state: 'synced' })
  } catch (error) {
    if (gen === generation) setStatus({ state: 'offline' })
    console.warn('Terrapedia: falha ao sincronizar a biblioteca', error)
  } finally {
    if (running === gen) running = null
  }
}

/** Busca de novo no servidor (ex.: mudanças feitas em outro aparelho). */
function refetch() {
  if (!userId) return
  fetchPending = true
  void work()
}

function checkImportOffer() {
  if (!userId || read(importAskedKey(userId))) return
  const local = loadLocal()
  const offer = { favorites: local.favorites.length, readLater: local.readLater.length, groups: local.groups.length }
  if (offer.favorites + offer.readLater + offer.groups > 0) setStatus({ importOffer: offer })
}

onUserChange((user) => {
  generation++
  userId = user?.id ?? null
  fetchPending = false
  if (userId) {
    const cache = read<CloudCache>(cloudKey(userId))
    data = cache?.data ?? EMPTY
    synced = cache?.synced ?? EMPTY
    status = { state: 'loading', importOffer: null }
    refetch()
  } else {
    // Ao sair, volta a mostrar o que está salvo só no aparelho. A cópia da conta fica guardada
    // (com mudanças que ainda não foram enviadas) para o próximo login.
    data = loadLocal()
    synced = EMPTY
    status = { state: 'local', importOffer: null }
  }
  emit()
})

window.addEventListener('storage', (e) => {
  // Outra aba do app mudou os dados
  if (!userId && e.key === LOCAL_KEY) {
    data = loadLocal()
    emit()
  } else if (userId && e.key === cloudKey(userId)) {
    const cache = read<CloudCache>(e.key)
    if (cache) {
      data = cache.data
      synced = cache.synced
      emit()
    }
  }
})
window.addEventListener('online', refetch)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refetch()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Lê a biblioteca e redesenha o componente sempre que ela muda. */
export function useLibrary() {
  return useSyncExternalStore(subscribe, () => data)
}

/** Situação da sincronização com a conta (para a tela de conta e o aviso de importar). */
export function useSyncStatus() {
  return useSyncExternalStore(subscribe, () => status)
}

const now = () => new Date().toISOString()
const samePage = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Id no formato UUID (o banco exige). `randomUUID` só existe em https/localhost. */
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Junta a biblioteca do aparelho na da conta, sem repetir artigos (grupos com o mesmo nome se juntam). */
function merge(base: LibraryData, extra: LibraryData): LibraryData {
  const addMissing = <T extends ArticleRef>(list: T[], more: T[]) => [
    ...list,
    ...more.filter((m) => !list.some((i) => samePage(i.page, m.page))),
  ]
  const sameName = (a: Group, b: Group) => a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  const groups = [...base.groups]
  for (const g of extra.groups) {
    const i = groups.findIndex((b) => sameName(b, g))
    // Grupo novo ganha id novo: o mesmo aparelho pode ser importado por duas contas
    if (i === -1) groups.push({ ...g, id: newId() })
    else groups[i] = { ...groups[i], items: addMissing(groups[i].items, g.items) }
  }
  return {
    ...base,
    favorites: addMissing(base.favorites, extra.favorites),
    readLater: addMissing(base.readLater, extra.readLater),
    groups,
  }
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

  /** Primeiro login: copia para a conta o que estava salvo só neste aparelho. */
  importLocal() {
    if (!userId) return
    write(importAskedKey(userId), true)
    setStatus({ importOffer: null })
    commit(merge(data, loadLocal()))
  },

  /** Primeiro login: não importar (e não perguntar de novo nesta conta, neste aparelho). */
  dismissImport() {
    if (!userId) return
    write(importAskedKey(userId), true)
    setStatus({ importOffer: null })
  },
}
