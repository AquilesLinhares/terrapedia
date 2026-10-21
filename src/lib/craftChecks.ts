// Checklist da árvore de crafting: materiais (ou itens intermediários) que eu já tenho.
//
// Com um mundo ativo, as marcações são do mundo (tabela `world_craft_checks`, todos os membros veem e
// mudam; a página relê a cada 20 s). Sem mundo, ficam neste aparelho (localStorage `terrapedia:craft-checks`).
// Cada árvore (item final) tem a sua lista.

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { useWorld } from './world'

const LOCAL_KEY = 'terrapedia:craft-checks'

/** Item da árvore → materiais marcados */
let local: Record<string, string[]> = {}
try {
  local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
} catch {
  // sem localStorage ou dado corrompido: começa do zero
}
/** "<mundo>|<item>" → materiais marcados no mundo */
const remote = new Map<string, string[]>()

let version = 0
const listeners = new Set<() => void>()
function emit() {
  version++
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function saveLocal(item: string, list: string[]) {
  local = { ...local, [item]: list }
  if (list.length === 0) delete local[item]
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local))
  } catch {
    // sem espaço ou bloqueado: vale até fechar a página
  }
  emit()
}

async function loadRemote(worldId: string, item: string) {
  if (!supabase) return
  const { data, error } = await supabase.from('world_craft_checks').select('material').eq('world_id', worldId).eq('item', item)
  if (error) return console.warn('Terrapedia: falha ao ler o checklist', error)
  remote.set(`${worldId}|${item}`, (data as { material: string }[]).map((r) => r.material))
  emit()
}

async function toggleRemote(worldId: string, item: string, material: string) {
  if (!supabase) return
  const key = `${worldId}|${item}`
  const list = remote.get(key) ?? []
  const checked = list.includes(material)
  remote.set(key, checked ? list.filter((m) => m !== material) : [...list, material])
  emit()
  const table = supabase.from('world_craft_checks')
  const { error } = checked
    ? await table.delete().eq('world_id', worldId).eq('item', item).eq('material', material)
    : await table.insert({ world_id: worldId, item, material })
  // 23505 = outra pessoa já marcou o mesmo material: está certo do mesmo jeito
  if (error && error.code !== '23505') {
    console.warn('Terrapedia: falha ao salvar o checklist', error)
    alert('Não foi possível salvar a marcação. Verifique a internet.')
  }
  void loadRemote(worldId, item)
}

/** Materiais marcados na árvore de `item` e onde ficam salvos (mundo ativo ou aparelho). */
export function useCraftChecks(item: string) {
  const { activeId } = useWorld()
  useSyncExternalStore(subscribe, () => version)

  useEffect(() => {
    if (!activeId) return
    void loadRemote(activeId, item)
    const timer = setInterval(() => document.visibilityState === 'visible' && loadRemote(activeId, item), 20_000)
    return () => clearInterval(timer)
  }, [activeId, item])

  const list = activeId ? remote.get(`${activeId}|${item}`) : local[item]
  const checked = useMemo(() => new Set(list ?? []), [list])
  return {
    checked,
    /** Mundo onde as marcações ficam (null = só neste aparelho) */
    worldId: activeId,
    toggle(material: string) {
      if (activeId) return void toggleRemote(activeId, item, material)
      const current = local[item] ?? []
      saveLocal(item, current.includes(material) ? current.filter((m) => m !== material) : [...current, material])
    },
    clear() {
      if (activeId) for (const m of checked) void toggleRemote(activeId, item, m)
      else saveLocal(item, [])
    },
  }
}
