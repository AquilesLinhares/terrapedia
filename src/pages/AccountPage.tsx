import { useEffect, useState } from 'react'
import { auth, useAuth } from '../lib/auth'
import { useLibrary, useSyncStatus, type SyncStatus } from '../lib/library'
import { supabase } from '../lib/supabase'
import { PageHeading } from '../components/PageHeading'
import { CloudIcon, UserIcon } from '../components/icons'

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none'

const statusText: Record<SyncStatus['state'], string> = {
  local: '',
  loading: 'Carregando sua biblioteca…',
  syncing: 'Salvando na conta…',
  synced: 'Tudo salvo na conta.',
  offline: 'Sem conexão: as mudanças ficam no aparelho e vão para a conta quando a internet voltar.',
}

export default function AccountPage() {
  const { user, ready } = useAuth()

  useEffect(() => {
    document.title = 'Conta · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <PageHeading title="Conta" />
      {!supabase ? (
        <p className="rounded-xl border border-line bg-panel p-4 text-sm text-muted">
          O login não está configurado nesta versão do app. Sua biblioteca continua salva neste aparelho.
        </p>
      ) : !ready ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : user ? (
        <SignedIn email={user.email ?? ''} />
      ) : (
        <SignInForm />
      )}
    </div>
  )
}

function SignedIn({ email }: { email: string }) {
  const { state } = useSyncStatus()
  const lib = useLibrary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signOut() {
    setBusy(true)
    setError(await auth.signOut())
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <UserIcon className="h-6 w-6" filled />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">Conectado como</p>
            <p className="truncate font-semibold">{email}</p>
          </div>
        </div>
        <p className={`mt-4 flex items-start gap-2 text-sm ${state === 'offline' ? 'text-gold' : 'text-muted'}`}>
          <CloudIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {statusText[state]}
        </p>
        <p className="mt-1 pl-6 text-sm text-muted">
          {lib.favorites.length} favorito(s) · {lib.readLater.length} em Buscar depois · {lib.groups.length} grupo(s)
        </p>
      </section>

      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="h-11 w-full rounded-xl border border-line text-sm font-semibold text-ink transition hover:border-accent disabled:opacity-50"
      >
        {busy ? 'Saindo…' : 'Sair'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-center text-xs text-muted">Ao sair, o app volta a mostrar o que está salvo só neste aparelho.</p>
    </div>
  )
}

function SignInForm() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = mode === 'signIn' ? await auth.signIn(email, password) : await auth.signUp(email, password)
    setError(result)
    setBusy(false)
  }

  const tab = (value: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value)
        setError(null)
      }}
      aria-pressed={mode === value}
      className={`h-9 flex-1 rounded-lg text-sm font-semibold transition ${
        mode === value ? 'bg-panel-2 text-gold' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Sem conta, sua biblioteca fica só neste aparelho. Entrando, ela aparece em qualquer celular ou PC onde você usar a
        mesma conta.
      </p>

      <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <div className="flex gap-1 rounded-xl bg-bg p-1">
          {tab('signIn', 'Entrar')}
          {tab('signUp', 'Criar conta')}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Senha</span>
          <input
            type="password"
            required
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === 'signUp' && <span className="mt-1 block text-xs text-muted">Pelo menos 6 caracteres.</span>}
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error.split('\n')[0]}
            {error.includes('\n') && <small className="mt-0.5 block text-xs text-muted">{error.split('\n').slice(1).join(' ')}</small>}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-bg transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Aguarde…' : mode === 'signIn' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
