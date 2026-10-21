// Notas nos artigos: "Minha nota" (só eu vejo) e "Nota do mundo" (membros do mundo ativo veem e editam).
//
// - Minha nota: com login, na tabela `notes` (RLS: cada um só vê as suas). Sem login, neste aparelho
//   (localStorage `terrapedia:notes`).
// - Nota do mundo: tabela `world_notes`, uma por página em cada mundo (RLS: só membros). Só com mundo ativo.
// Texto vazio apaga a nota.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { useWorld } from './world'

const LOCAL_KEY = 'terrapedia:notes'
export const NOTE_MAX = 5000

export interface WorldNote {
  body: string
  updatedBy: string | null
  updatedAt: string
}

function readLocal(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeLocal(page: string, body: string) {
  const all = readLocal()
  if (body) all[page] = body
  else delete all[page]
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch {
    // sem espaço ou bloqueado
  }
}

function db() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

/** Atualiza a linha; se ela não existe, cria. (O banco não deixa o "upsert" trocar a página/dono.) */
async function save(table: 'notes' | 'world_notes', match: Record<string, string>, body: string, userId: string) {
  const now = new Date().toISOString()
  if (!body) {
    const { error } = await db().from(table).delete().match(match)
    if (error) throw error
    return
  }
  const fields = table === 'notes' ? { body, updated_at: now } : { body, updated_at: now, updated_by: userId }
  const { data, error } = await db().from(table).update(fields).match(match).select('page')
  if (error) throw error
  if (data.length > 0) return
  const { error: insertError } = await db().from(table).insert({ ...match, body })
  if (insertError) throw insertError
}

/** Notas de uma página e as funções para salvar. `save*` devolvem null ou a mensagem de erro. */
export function useNotes(page: string) {
  const { user } = useAuth()
  const { activeId } = useWorld()
  const [mine, setMine] = useState<string | null>(null)
  const [worldNote, setWorldNote] = useState<WorldNote | null>(null)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    if (!user || !supabase) {
      setMine(readLocal()[page] ?? '')
      setWorldNote(null)
      setReady(true)
      return
    }
    const [own, shared] = await Promise.all([
      supabase.from('notes').select('body').eq('page', page).maybeSingle(),
      activeId
        ? supabase.from('world_notes').select('body, updated_by, updated_at').eq('world_id', activeId).eq('page', page).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (own.error || shared.error) return console.warn('Terrapedia: falha ao ler notas', own.error ?? shared.error)
    setMine((own.data as { body: string } | null)?.body ?? '')
    const w = shared.data as { body: string; updated_by: string | null; updated_at: string } | null
    setWorldNote(w ? { body: w.body, updatedBy: w.updated_by, updatedAt: w.updated_at } : null)
    setReady(true)
  }, [user, activeId, page])

  useEffect(() => {
    setReady(false)
    void load()
  }, [load])

  return {
    ready,
    mine: mine ?? '',
    worldNote,
    /** Mundo ativo (sem ele não há nota do mundo) */
    worldId: user ? activeId : null,
    /** Minha nota fica na conta (true) ou só no aparelho (false) */
    synced: !!user && !!supabase,
    async saveMine(body: string) {
      body = body.trim().slice(0, NOTE_MAX)
      if (!user || !supabase) {
        writeLocal(page, body)
        setMine(body)
        return null
      }
      try {
        await save('notes', { page }, body, user.id)
        setMine(body)
        return null
      } catch {
        return 'Não foi possível salvar. Verifique a internet.'
      }
    },
    async saveWorld(body: string) {
      body = body.trim().slice(0, NOTE_MAX)
      if (!user || !activeId) return null
      try {
        await save('world_notes', { world_id: activeId, page }, body, user.id)
        await load()
        return null
      } catch {
        return 'Não foi possível salvar. Verifique a internet.'
      }
    },
  }
}
