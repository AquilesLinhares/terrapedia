// Login com e-mail e senha (Supabase Auth).
//
// As telas usam `useAuth()` para saber quem está logado e `auth.*` para entrar, criar conta e
// sair. A biblioteca (library.ts) escuta `onUserChange` para trocar entre os dados do aparelho
// e os da conta.

import { useSyncExternalStore } from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  user: User | null
  /** false enquanto o Supabase ainda está lendo a sessão salva */
  ready: boolean
}

let state: AuthState = { user: null, ready: !supabase }
const listeners = new Set<() => void>()
const userListeners = new Set<(user: User | null) => void>()

supabase?.auth.onAuthStateChange((_event, session) => {
  const user = session?.user ?? null
  const changedUser = user?.id !== state.user?.id || !state.ready
  state = { user, ready: true }
  // O Supabase pede para não chamar outras funções dele dentro deste aviso: adiamos um instante.
  setTimeout(() => {
    listeners.forEach((listener) => listener())
    if (changedUser) userListeners.forEach((listener) => listener(user))
  })
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state)
}

/** Avisa quando alguém entra ou sai (também na primeira leitura da sessão). */
export function onUserChange(callback: (user: User | null) => void) {
  userListeners.add(callback)
}

/** Traduz os erros mais comuns do Supabase para mensagens em português. */
function message(error: AuthError | null) {
  if (!error) return null
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com esse e-mail. Tente entrar.'
    case 'weak_password':
      return 'Senha fraca: use pelo menos 6 caracteres.'
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Confira o e-mail digitado.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Muitas tentativas. Espere um pouco e tente de novo.'
  }
  if (error.name === 'AuthRetryableFetchError') return 'Sem conexão com o servidor. Verifique a internet.'
  return error.message
}

const notConfigured = 'Login indisponível: o Supabase não está configurado (.env).'

/** Cada função devolve `null` se deu certo, ou a mensagem de erro. */
export const auth = {
  async signIn(email: string, password: string) {
    if (!supabase) return notConfigured
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return message(error)
  },

  async signUp(email: string, password: string) {
    if (!supabase) return notConfigured
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error) return message(error)
    // Com a confirmação de e-mail desligada, a conta já entra logada.
    if (!data.session) return 'Conta criada! Confira seu e-mail para confirmar e depois entre.'
    return null
  },

  async signOut() {
    if (!supabase) return null
    const { error } = await supabase.auth.signOut()
    return message(error)
  },
}
