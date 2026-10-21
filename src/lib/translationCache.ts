// Cache compartilhado das traduções (tabela `page_translations` no Supabase).
// Quem traduz no Chrome do computador (e está logado) salva os trechos; qualquer pessoa,
// em qualquer aparelho e mesmo sem login, lê. Assim a mesma página não é traduzida duas vezes.

import type { Translations } from './localize'
import { supabase } from './supabase'

/** Trechos já traduzidos de um artigo ({} se não houver, ou sem internet/Supabase). */
export async function fetchCachedTranslations(page: string): Promise<Translations> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('page_translations').select('segments').eq('page', page).eq('lang', 'pt').maybeSingle()
  if (error || !data) return {}
  // Só textos: qualquer outra coisa é ignorada (o app sempre insere as traduções como texto puro)
  return Object.fromEntries(Object.entries(data.segments as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Translations
}

/** Salva trechos novos (só com login; sem login a tradução fica só nesta tela). */
export async function saveTranslations(page: string, segments: Translations): Promise<boolean> {
  if (!supabase || !Object.keys(segments).length) return false
  const { data } = await supabase.auth.getSession()
  if (!data.session) return false
  const { error } = await supabase.rpc('merge_page_translation', { p_page: page, p_segments: segments })
  return !error
}
