// Mundo compartilhado: mundos da conta, mundo ativo, membros, progresso e atividade.
//
// Tudo fica no Supabase (tabelas worlds, world_members, world_progress e world_activity — veja
// supabase/schema.sql). Só membros veem os dados de um mundo (RLS). Criar e entrar por código usam
// as funções create_world/join_world do banco. O mundo ativo de cada conta fica salvo no aparelho
// (`terrapedia:active-world:<id>`). Sem login não há mundos.
//
// As telas usam `useWorld()` (ler), `useWorldStage()` (etapa do mundo ativo) e `world.*` (mudar).

import { useSyncExternalStore } from 'react'
import { onUserChange } from './auth'
import { library } from './library'
import { currentStage } from './progression'
import { supabase } from './supabase'

export type WorldMode = 'classic' | 'expert' | 'master'
export type PlayerClass = 'melee' | 'ranged' | 'magic' | 'summoner'

export const MODE_LABELS: Record<WorldMode, string> = { classic: 'Clássico', expert: 'Expert', master: 'Mestre' }
export const CLASS_LABELS: Record<PlayerClass, string> = {
  melee: 'Corpo a corpo',
  ranged: 'À distância',
  magic: 'Mago',
  summoner: 'Invocador',
}

export interface World {
  id: string
  name: string
  mode: WorldMode
  inviteCode: string
  createdBy: string | null
}

export interface Member {
  userId: string
  name: string
  playerClass: PlayerClass | null
  subclass: string | null
}

export interface Defeat {
  key: string
  markedBy: string | null
  markedAt: string
}

export interface Activity {
  id: number
  userId: string | null
  actorName: string
  kind: 'created' | 'joined' | 'defeated' | 'group_created' | 'item_added'
  subject: string | null
  subjectPt: string | null
  groupName: string | null
  createdAt: string
}

export interface WorldState {
  userId: string | null
  /** false enquanto lê a lista de mundos */
  ready: boolean
  worlds: World[]
  activeId: string | null
  members: Member[]
  progress: Defeat[]
  activity: Activity[]
  /** Última falha ao ler (ex.: sem internet) */
  error: string | null
}

const EMPTY: WorldState = { userId: null, ready: true, worlds: [], activeId: null, members: [], progress: [], activity: [], error: null }

let state = EMPTY
const listeners = new Set<() => void>()
/** Muda a cada login/logout, para ignorar respostas atrasadas da conta anterior. */
let generation = 0

function set(patch: Partial<WorldState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

const activeKey = (userId: string) => `terrapedia:active-world:${userId}`

function saveActive(id: string | null) {
  if (!state.userId) return
  try {
    if (id) localStorage.setItem(activeKey(state.userId), id)
    else localStorage.removeItem(activeKey(state.userId))
  } catch {
    // sem localStorage: o mundo ativo vale até fechar a página
  }
}

function savedActive(userId: string) {
  try {
    return localStorage.getItem(activeKey(userId))
  } catch {
    return null
  }
}

function db() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

function check<T>({ data, error }: { data: T | null; error: { message: string } | null }) {
  if (error) throw new Error(error.message)
  return data as T
}

/** Lê de novo a lista de mundos e os dados do mundo ativo. */
async function load() {
  const gen = generation
  const userId = state.userId
  if (!userId || !supabase) return
  try {
    const rows = check<{ id: string; name: string; mode: WorldMode; invite_code: string; created_by: string | null }[]>(
      await db().from('worlds').select('id, name, mode, invite_code, created_by').order('created_at'),
    )
    if (gen !== generation) return
    const worlds = rows.map((w) => ({ id: w.id, name: w.name, mode: w.mode, inviteCode: w.invite_code, createdBy: w.created_by }))
    const wanted = state.activeId ?? savedActive(userId)
    const activeId = worlds.some((w) => w.id === wanted) ? wanted : (worlds[0]?.id ?? null)
    if (!activeId) {
      set({ worlds, activeId, members: [], progress: [], activity: [], ready: true, error: null })
      return
    }
    const [members, progress, activity] = await Promise.all([
      db().from('world_members').select('user_id, display_name, class, subclass').eq('world_id', activeId).order('joined_at'),
      db().from('world_progress').select('key, marked_by, marked_at').eq('world_id', activeId),
      db()
        .from('world_activity')
        .select('id, user_id, actor_name, kind, subject, subject_pt, group_name, created_at')
        .eq('world_id', activeId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (gen !== generation) return
    set({
      worlds,
      activeId,
      ready: true,
      error: null,
      members: check<{ user_id: string; display_name: string; class: PlayerClass | null; subclass: string | null }[]>(members).map(
        (m) => ({ userId: m.user_id, name: m.display_name, playerClass: m.class, subclass: m.subclass }),
      ),
      progress: check<{ key: string; marked_by: string | null; marked_at: string }[]>(progress).map((p) => ({
        key: p.key,
        markedBy: p.marked_by,
        markedAt: p.marked_at,
      })),
      activity: check<
        {
          id: number
          user_id: string | null
          actor_name: string
          kind: Activity['kind']
          subject: string | null
          subject_pt: string | null
          group_name: string | null
          created_at: string
        }[]
      >(activity).map((a) => ({
        id: a.id,
        userId: a.user_id,
        actorName: a.actor_name,
        kind: a.kind,
        subject: a.subject,
        subjectPt: a.subject_pt,
        groupName: a.group_name,
        createdAt: a.created_at,
      })),
    })
  } catch (error) {
    if (gen === generation) set({ ready: true, error: 'Não foi possível carregar o mundo. Verifique a internet.' })
    console.warn('Terrapedia: falha ao ler o mundo', error)
  }
}

onUserChange((user) => {
  generation++
  state = { ...EMPTY, userId: user?.id ?? null, ready: !user }
  listeners.forEach((listener) => listener())
  void load()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void load()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorld() {
  return useSyncExternalStore(subscribe, () => state)
}

export const activeWorld = (s: WorldState) => s.worlds.find((w) => w.id === s.activeId) ?? null

/** Etapa atual do mundo ativo (ou null sem mundo). Para a página do mundo e os futuros guias de classe. */
export function useWorldStage() {
  const s = useWorld()
  return s.activeId ? currentStage(s.progress.map((p) => p.key)) : null
}

/** Nome padrão de quem entra num mundo: o começo do e-mail. */
export const defaultPlayerName = (email?: string) => (email?.split('@')[0] ?? 'Jogador').slice(0, 30)

// Todas as ações. As que podem falhar devolvem `null` se deu certo, ou a mensagem de erro.
export const world = {
  reload: load,

  setActive(id: string) {
    if (id === state.activeId) return
    saveActive(id)
    set({ activeId: id, members: [], progress: [], activity: [] })
    void load()
  },

  async create(name: string, mode: WorldMode, playerName: string) {
    try {
      const id = check<string>(await db().rpc('create_world', { p_name: name, p_mode: mode, p_display_name: playerName }))
      saveActive(id)
      set({ activeId: id })
      await load()
      return null
    } catch {
      return 'Não foi possível criar o mundo. Verifique a internet.'
    }
  },

  async join(code: string, playerName: string) {
    try {
      const id = check<string | null>(await db().rpc('join_world', { p_code: code, p_display_name: playerName }))
      if (!id) return 'Código não encontrado. Confira e tente de novo.'
      saveActive(id)
      set({ activeId: id })
      await load()
      library.refresh() // os grupos do mundo passam a aparecer
      return null
    } catch {
      return 'Não foi possível entrar no mundo. Verifique a internet.'
    }
  },

  /** Sai do mundo (quem criou também pode apagá-lo de vez com `remove`). */
  async leave(id: string) {
    try {
      check(await db().from('world_members').delete().eq('world_id', id).eq('user_id', state.userId ?? ''))
      if (state.activeId === id) {
        saveActive(null)
        set({ activeId: null })
      }
      await load()
      library.refresh()
      return null
    } catch {
      return 'Não foi possível sair do mundo. Verifique a internet.'
    }
  },

  async remove(id: string) {
    try {
      check(await db().from('worlds').delete().eq('id', id))
      if (state.activeId === id) {
        saveActive(null)
        set({ activeId: null })
      }
      await load()
      library.refresh()
      return null
    } catch {
      return 'Não foi possível apagar o mundo. Verifique a internet.'
    }
  },

  /** Muda a própria ficha no mundo ativo (nome, classe, subclasse). */
  async updateMe(patch: { name?: string; playerClass?: PlayerClass | null; subclass?: string | null }) {
    const { activeId, userId } = state
    if (!activeId || !userId) return null
    set({ members: state.members.map((m) => (m.userId === userId ? { ...m, ...patch } : m)) })
    try {
      check(
        await db()
          .from('world_members')
          .update({
            ...(patch.name !== undefined && { display_name: patch.name.trim().slice(0, 30) || 'Jogador' }),
            ...(patch.playerClass !== undefined && { class: patch.playerClass }),
            ...(patch.subclass !== undefined && { subclass: patch.subclass?.trim().slice(0, 40) || null }),
          })
          .eq('world_id', activeId)
          .eq('user_id', userId),
      )
      return null
    } catch {
      void load()
      return 'Não foi possível salvar. Verifique a internet.'
    }
  },

  /** Marca ou desmarca um chefe/evento como derrotado no mundo ativo. */
  async toggleDefeated(key: string) {
    const { activeId, userId } = state
    if (!activeId || !userId) return null
    const done = state.progress.some((p) => p.key === key)
    set({
      progress: done
        ? state.progress.filter((p) => p.key !== key)
        : [...state.progress, { key, markedBy: userId, markedAt: new Date().toISOString() }],
    })
    try {
      check(
        done
          ? await db().from('world_progress').delete().eq('world_id', activeId).eq('key', key)
          : await db().from('world_progress').insert({ world_id: activeId, key }),
      )
      void load() // traz a atividade nova
      return null
    } catch {
      void load()
      return 'Não foi possível salvar. Verifique a internet.'
    }
  },
}
