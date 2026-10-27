// Quadro de tarefas da dupla (página /mundo): quem farma ou constrói o quê.
//
// Com mundo ativo fica na tabela world_tasks (todos os membros veem, criam, marcam e apagam; a tela relê a
// cada 20 s com a aba visível). Sem mundo, fica no aparelho em `terrapedia:tasks` (sem responsável).

import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { useWorld } from './world'

export interface Task {
  id: string
  title: string
  /** Nome EN do item (opcional) */
  itemPage: string | null
  /** Membro responsável (só no mundo) */
  assignedTo: string | null
  done: boolean
  createdBy: string | null
  createdAt: string
}

export type NewTask = Pick<Task, 'title' | 'itemPage' | 'assignedTo'>

const LOCAL_KEY = 'terrapedia:tasks'

let local: Task[] = []
try {
  local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
} catch {
  // sem localStorage ou dado corrompido: começa do zero
}
/** Mundo → tarefas */
const remote = new Map<string, Task[]>()

let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function saveLocal(tasks: Task[]) {
  local = tasks
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local))
  } catch {
    // sem espaço ou bloqueado: vale até fechar a página
  }
  emit()
}

interface Row {
  id: string
  title: string
  item_page: string | null
  assigned_to: string | null
  done: boolean
  created_by: string | null
  created_at: string
}

const fromRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  itemPage: r.item_page,
  assignedTo: r.assigned_to,
  done: r.done,
  createdBy: r.created_by,
  createdAt: r.created_at,
})

async function loadRemote(worldId: string) {
  if (!supabase) return
  const { data, error } = await supabase
    .from('world_tasks')
    .select('id, title, item_page, assigned_to, done, created_by, created_at')
    .eq('world_id', worldId)
    .order('created_at')
  if (error) return console.warn('Terrapedia: falha ao ler world_tasks', error)
  remote.set(worldId, (data as Row[]).map(fromRow))
  emit()
}

/** Muda a lista na tela na hora, envia ao banco e relê. */
async function changeRemote(worldId: string, optimistic: (tasks: Task[]) => Task[], send: () => PromiseLike<{ error: unknown }>) {
  remote.set(worldId, optimistic(remote.get(worldId) ?? []))
  emit()
  const { error } = await send()
  if (error) {
    console.warn('Terrapedia: falha ao salvar world_tasks', error)
    alert('Não foi possível salvar a tarefa. Verifique a internet.')
  }
  void loadRemote(worldId)
}

/** Tarefas do mundo ativo (ou do aparelho) e as ações. */
export function useTasks() {
  const { activeId, userId } = useWorld()
  useSyncExternalStore(subscribe, () => version)

  useEffect(() => {
    if (!activeId) return
    void loadRemote(activeId)
    const timer = setInterval(() => document.visibilityState === 'visible' && loadRemote(activeId), 20_000)
    const onVisible = () => document.visibilityState === 'visible' && loadRemote(activeId)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activeId])

  const tasks = activeId ? remote.get(activeId) ?? [] : local
  return {
    tasks,
    /** false enquanto lê as tarefas do mundo pela primeira vez */
    ready: !activeId || remote.has(activeId),
    /** Mundo onde as tarefas ficam (null = só neste aparelho) */
    worldId: activeId,
    add({ title, itemPage, assignedTo }: NewTask) {
      const task: Task = {
        id: crypto.randomUUID(),
        title: title.trim().slice(0, 200),
        itemPage,
        assignedTo: activeId ? assignedTo : null,
        done: false,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      }
      if (!task.title) return
      if (!activeId) return saveLocal([...local, task])
      const sb = supabase!
      void changeRemote(
        activeId,
        (list) => [...list, task],
        () => sb.from('world_tasks').insert({ id: task.id, world_id: activeId, title: task.title, item_page: itemPage, assigned_to: task.assignedTo }),
      )
    },
    toggle(id: string) {
      const flip = (list: Task[]) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      if (!activeId) return saveLocal(flip(local))
      const task = tasks.find((t) => t.id === id)
      if (!task) return
      const sb = supabase!
      void changeRemote(activeId, flip, () => sb.from('world_tasks').update({ done: !task.done }).eq('id', id))
    },
    remove(id: string) {
      const drop = (list: Task[]) => list.filter((t) => t.id !== id)
      if (!activeId) return saveLocal(drop(local))
      const sb = supabase!
      void changeRemote(activeId, drop, () => sb.from('world_tasks').delete().eq('id', id))
    },
  }
}
