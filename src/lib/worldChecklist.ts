// Checklists que ficam no mundo ativo (todos os membros veem e mudam) ou, sem mundo, no aparelho.
//
// Cada checklist é uma tabela do Supabase com (world_id, <lista>, <marcado>) — ex.: world_craft_checks
// (item → material) e world_buff_checks (chefe → item) — e uma chave no localStorage. Com mundo, a tela
// relê a cada 20 s para ver o que os outros marcaram.

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { useWorld } from './world'

interface Options {
  table: string
  /** Coluna que separa as listas ("item" na árvore, "boss" nos buffs) */
  listColumn: string
  /** Coluna do que foi marcado */
  valueColumn: string
  localKey: string
}

export function createWorldChecklist({ table, listColumn, valueColumn, localKey }: Options) {
  /** Lista → marcados (no aparelho) */
  let local: Record<string, string[]> = {}
  try {
    local = JSON.parse(localStorage.getItem(localKey) ?? '{}')
  } catch {
    // sem localStorage ou dado corrompido: começa do zero
  }
  /** "<mundo>|<lista>" → marcados no mundo */
  const remote = new Map<string, string[]>()

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

  function saveLocal(list: string, values: string[]) {
    local = { ...local, [list]: values }
    if (values.length === 0) delete local[list]
    try {
      localStorage.setItem(localKey, JSON.stringify(local))
    } catch {
      // sem espaço ou bloqueado: vale até fechar a página
    }
    emit()
  }

  async function loadRemote(worldId: string, list: string) {
    if (!supabase) return
    const { data, error } = await supabase.from(table).select(valueColumn).eq('world_id', worldId).eq(listColumn, list)
    if (error) return console.warn(`Terrapedia: falha ao ler ${table}`, error)
    remote.set(`${worldId}|${list}`, (data as unknown as Record<string, string>[]).map((r) => r[valueColumn]))
    emit()
  }

  async function toggleRemote(worldId: string, list: string, value: string) {
    if (!supabase) return
    const key = `${worldId}|${list}`
    const current = remote.get(key) ?? []
    const checked = current.includes(value)
    remote.set(key, checked ? current.filter((v) => v !== value) : [...current, value])
    emit()
    const t = supabase.from(table)
    const { error } = checked
      ? await t.delete().eq('world_id', worldId).eq(listColumn, list).eq(valueColumn, value)
      : await t.insert({ world_id: worldId, [listColumn]: list, [valueColumn]: value })
    // 23505 = outra pessoa já marcou o mesmo: está certo do mesmo jeito
    if (error && error.code !== '23505') {
      console.warn(`Terrapedia: falha ao salvar ${table}`, error)
      alert('Não foi possível salvar a marcação. Verifique a internet.')
    }
    void loadRemote(worldId, list)
  }

  /** Marcados na lista `list` e onde ficam salvos (mundo ativo ou aparelho). */
  return function useChecklist(list: string) {
    const { activeId } = useWorld()
    useSyncExternalStore(subscribe, () => version)

    useEffect(() => {
      if (!activeId) return
      void loadRemote(activeId, list)
      const timer = setInterval(() => document.visibilityState === 'visible' && loadRemote(activeId, list), 20_000)
      const onVisible = () => document.visibilityState === 'visible' && loadRemote(activeId, list)
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        clearInterval(timer)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }, [activeId, list])

    const values = activeId ? remote.get(`${activeId}|${list}`) : local[list]
    const checked = useMemo(() => new Set(values ?? []), [values])
    return {
      checked,
      /** Mundo onde as marcações ficam (null = só neste aparelho) */
      worldId: activeId,
      toggle(value: string) {
        if (activeId) return void toggleRemote(activeId, list, value)
        const current = local[list] ?? []
        saveLocal(list, current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
      },
      clear() {
        if (activeId) for (const v of checked) void toggleRemote(activeId, list, v)
        else saveLocal(list, [])
      },
    }
  }
}
