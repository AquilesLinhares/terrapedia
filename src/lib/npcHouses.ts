// Casas montadas na Felicidade dos NPCs (/ferramentas/felicidade).
//
// Com um mundo ativo ficam na tabela `world_npc_houses` (uma linha por mundo; todos os membros veem e mudam;
// relê a cada 20 s). Sem mundo, neste aparelho (localStorage `terrapedia:npc-houses`).

import { useEffect, useSyncExternalStore } from 'react'
import type { House } from './npcs'
import { supabase } from './supabase'
import { useWorld } from './world'

const LOCAL_KEY = 'terrapedia:npc-houses'

let local: House[] = []
try {
  local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
} catch {
  // sem localStorage ou dado corrompido: começa do zero
}
/** Mundo → casas */
const remote = new Map<string, House[]>()
/** Mundos com mudança ainda não enviada (a releitura não passa por cima) */
const pending = new Map<string, ReturnType<typeof setTimeout>>()

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

async function load(worldId: string) {
  if (!supabase || pending.has(worldId)) return
  const { data, error } = await supabase.from('world_npc_houses').select('houses').eq('world_id', worldId).maybeSingle()
  if (error) return console.warn('Terrapedia: falha ao ler world_npc_houses', error)
  if (pending.has(worldId)) return
  remote.set(worldId, (data?.houses as House[] | undefined) ?? [])
  emit()
}

function saveRemote(worldId: string, userId: string, houses: House[]) {
  remote.set(worldId, houses)
  emit()
  clearTimeout(pending.get(worldId))
  // Espera parar de mexer por um instante e manda tudo de uma vez
  pending.set(
    worldId,
    setTimeout(async () => {
      // `update` e, se o mundo ainda não tinha linha, `insert` (o banco só deixa mudar houses/updated_*)
      const row = { houses: remote.get(worldId) ?? [], updated_by: userId, updated_at: new Date().toISOString() }
      const table = supabase!.from('world_npc_houses')
      let { data, error } = await table.update(row).eq('world_id', worldId).select('world_id')
      if (!error && !data?.length) ({ error } = await supabase!.from('world_npc_houses').insert({ world_id: worldId, ...row }))
      // 23505 = outra pessoa criou a linha ao mesmo tempo: tenta o update de novo
      if (error?.code === '23505') ({ error } = await supabase!.from('world_npc_houses').update(row).eq('world_id', worldId))
      pending.delete(worldId)
      if (error) {
        console.warn('Terrapedia: falha ao salvar world_npc_houses', error)
        alert('Não foi possível salvar as casas no mundo. Verifique a internet.')
      }
    }, 800),
  )
}

/** Casas salvas e onde ficam (mundo ativo ou aparelho). */
export function useNpcHouses() {
  const { activeId, userId } = useWorld()
  useSyncExternalStore(subscribe, () => version)

  useEffect(() => {
    if (!activeId) return
    void load(activeId)
    const timer = setInterval(() => document.visibilityState === 'visible' && load(activeId), 20_000)
    return () => clearInterval(timer)
  }, [activeId])

  return {
    /** null enquanto as casas do mundo ainda não chegaram */
    houses: activeId ? (remote.get(activeId) ?? null) : local,
    worldId: activeId,
    save(houses: House[]) {
      if (activeId && userId) return saveRemote(activeId, userId, houses)
      local = houses
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(houses))
      } catch {
        // sem espaço ou bloqueado: vale até fechar a página
      }
      emit()
    },
  }
}
