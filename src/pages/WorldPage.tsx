import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useLibrary } from '../lib/library'
import { MILESTONES, milestone, type Milestone, type Phase } from '../lib/progression'
import { supabase } from '../lib/supabase'
import {
  activeWorld,
  CLASS_LABELS,
  defaultPlayerName,
  MODE_LABELS,
  useWorld,
  useWorldStage,
  world,
  type Activity,
  type Member,
  type PlayerClass,
  type World,
  type WorldMode,
} from '../lib/world'
import { PageHeading } from '../components/PageHeading'
import { CheckIcon, ChevronRightIcon, FolderIcon, GlobeIcon, PlusIcon } from '../components/icons'

const inputClass =
  'h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none'
const buttonClass =
  'flex h-11 items-center justify-center gap-1 rounded-xl bg-accent px-4 text-sm font-semibold text-bg transition disabled:opacity-40'
const cardClass = 'rounded-xl border border-line bg-panel p-4'

const SUBCLASSES: Record<PlayerClass, string[]> = {
  melee: ['Espadas', 'Lanças', 'Ioiôs', 'Manguais', 'Bumerangues'],
  ranged: ['Arcos', 'Armas de fogo', 'Lançadores', 'Arremesso'],
  magic: ['Cajados', 'Livros de magia', 'Armas mágicas'],
  summoner: ['Lacaios', 'Sentinelas', 'Chicotes'],
}

/** Lê de novo a cada 20 s enquanto a página está aberta (para ver o que os outros membros marcam). */
function usePolling() {
  useEffect(() => {
    void world.reload()
    const timer = setInterval(() => document.visibilityState === 'visible' && void world.reload(), 20000)
    return () => clearInterval(timer)
  }, [])
}

export default function WorldPage() {
  const { user, ready } = useAuth()
  const state = useWorld()
  const current = activeWorld(state)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    document.title = 'Meu mundo · Terrapedia'
  }, [])
  usePolling()

  let body: React.ReactNode
  if (!supabase) body = <p className={`${cardClass} text-sm text-muted`}>O login não está configurado nesta versão do app.</p>
  else if (!ready || (user && !state.ready)) body = <p className="text-sm text-muted">Carregando…</p>
  else if (!user)
    body = (
      <p className={`${cardClass} text-sm text-muted`}>
        Para criar um mundo compartilhado e jogar junto, <Link to="/conta" className="font-semibold text-accent hover:underline">entre na sua conta</Link>.
      </p>
    )
  else if (!current || adding)
    body = (
      <>
        {state.error && <p className="mb-3 text-sm text-red-300">{state.error}</p>}
        <StartForms email={user.email} onDone={() => setAdding(false)} onCancel={current ? () => setAdding(false) : undefined} />
      </>
    )
  else body = <WorldView current={current} onAdd={() => setAdding(true)} />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeading title="Meu mundo" subtitle="Progresso, membros e grupos do mundo que vocês jogam juntos." />
      {body}
    </div>
  )
}

function StartForms({ email, onDone, onCancel }: { email?: string; onDone: () => void; onCancel?: () => void }) {
  const [player, setPlayer] = useState(defaultPlayerName(email))
  const [name, setName] = useState('')
  const [mode, setMode] = useState<WorldMode>('classic')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const message = await action()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-muted">Seu nome no mundo</span>
        <input value={player} onChange={(e) => setPlayer(e.target.value)} maxLength={30} className={inputClass} />
      </label>

      <form
        className={`${cardClass} space-y-3`}
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim() && player.trim()) void run(() => world.create(name, mode, player))
        }}
      >
        <h2 className="font-display text-lg font-bold text-gold">Criar um mundo</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do mundo" aria-label="Nome do mundo" maxLength={60} className={inputClass} />
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1" role="group" aria-label="Modo">
          {(Object.keys(MODE_LABELS) as WorldMode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm transition ${mode === m ? 'bg-gold/15 font-semibold text-gold' : 'text-muted hover:text-ink'}`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy || !name.trim() || !player.trim()} className={`${buttonClass} w-full`}>
          <PlusIcon className="h-4 w-4" />
          Criar mundo
        </button>
      </form>

      <form
        className={`${cardClass} space-y-3`}
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim() && player.trim()) void run(() => world.join(code, player))
        }}
      >
        <h2 className="font-display text-lg font-bold text-gold">Entrar com um código</h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TERRA-7K2Q"
          aria-label="Código do convite"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          className={`${inputClass} font-mono tracking-wider`}
        />
        <button type="submit" disabled={busy || !code.trim() || !player.trim()} className={`${buttonClass} w-full`}>
          Entrar no mundo
        </button>
      </form>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="w-full py-2 text-sm text-muted hover:text-ink">
          Voltar para o mundo ativo
        </button>
      )}
    </div>
  )
}

function WorldView({ current, onAdd }: { current: World; onAdd: () => void }) {
  const state = useWorld()
  const stage = useWorldStage()
  const [copied, setCopied] = useState(false)

  function copyCode() {
    void navigator.clipboard?.writeText(current.inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="space-y-5">
      <section className={`${cardClass} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          {state.worlds.length > 1 ? (
            <select
              value={current.id}
              onChange={(e) => world.setActive(e.target.value)}
              aria-label="Mundo ativo"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 font-display text-lg font-bold text-gold focus:border-accent focus:outline-none"
            >
              {state.worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <h2 className="min-w-0 flex-1 truncate font-display text-2xl font-bold text-gold">{current.name}</h2>
          )}
          <button type="button" onClick={onAdd} className="flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm text-muted transition hover:border-accent hover:text-ink">
            <PlusIcon className="h-4 w-4" />
            Outro mundo
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-gold/15 px-2.5 py-1 font-semibold text-gold">{MODE_LABELS[current.mode]}</span>
          {stage && (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 font-semibold text-accent">
              Etapa: {stage.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          Convite:
          <button
            type="button"
            onClick={copyCode}
            title="Copiar código"
            className="rounded-lg border border-dashed border-line px-2.5 py-1 font-mono text-base tracking-wider text-ink transition hover:border-accent"
          >
            {current.inviteCode}
          </button>
          {copied && <span className="text-accent">copiado!</span>}
        </div>
        {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-4">
          <ProgressList phase="pre" title="Pré-Modo Difícil" />
          <ProgressList phase="hard" title="Modo Difícil" />
        </section>
        <div className="space-y-5">
          <Members />
          <WorldGroups worldId={current.id} />
          <ActivityList />
          <DangerZone current={current} />
        </div>
      </div>
    </div>
  )
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function ProgressList({ phase, title }: { phase: Phase; title: string }) {
  const { progress, members } = useWorld()
  const list = MILESTONES.filter((m) => m.phase === phase)
  const doneCount = list.filter((m) => progress.some((p) => p.key === m.key)).length
  const [error, setError] = useState<string | null>(null)

  async function toggle(m: Milestone, done: boolean) {
    if (done && !window.confirm(`Desmarcar ${m.pt}?`)) return
    setError(await world.toggleDefeated(m.key))
  }

  return (
    <div className={cardClass}>
      <h2 className="mb-2 flex items-baseline justify-between font-display text-lg font-bold text-gold">
        {title}
        <span className="text-sm font-normal text-muted">
          {doneCount}/{list.length}
        </span>
      </h2>
      {error && <p className="mb-2 text-sm text-red-300">{error}</p>}
      <ul className="-mx-2">
        {list.map((m) => {
          const defeat = progress.find((p) => p.key === m.key)
          const by = defeat && (members.find((x) => x.userId === defeat.markedBy)?.name ?? 'alguém')
          return (
            <li key={m.key} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={!!defeat}
                onClick={() => void toggle(m, !!defeat)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-bg/50"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${defeat ? 'border-gold bg-gold text-bg' : 'border-line'}`}
                >
                  {defeat && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <img src={m.icon} alt="" loading="lazy" className={`pixelated max-h-9 max-w-9 object-contain ${defeat ? '' : 'opacity-60'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-semibold ${defeat ? 'text-ink' : 'text-ink/80'}`}>
                    {m.pt}
                    {m.kind === 'evento' && <span className="ml-1.5 rounded bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">evento</span>}
                    {m.optional && <span className="ml-1.5 rounded border border-line px-1.5 text-[11px] font-normal text-muted">opcional</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {defeat ? `✓ ${by} · ${shortDate(defeat.markedAt)}` : m.key}
                  </span>
                </span>
              </button>
              <Link to={`/wiki/${encodeURIComponent(m.key.replace(/ /g, '_'))}`} aria-label={`Abrir ${m.pt} na wiki`} className="rounded-lg p-2 text-muted hover:text-accent">
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Members() {
  const { members, userId } = useWorld()
  return (
    <section className={cardClass}>
      <h2 className="mb-2 font-display text-lg font-bold text-gold">Membros</h2>
      <ul className="space-y-2">
        {members.map((m) => (m.userId === userId ? <MyCard key={m.userId} me={m} /> : <MemberRow key={m.userId} member={m} />))}
      </ul>
    </section>
  )
}

const classText = (m: Member) => (m.playerClass ? `${CLASS_LABELS[m.playerClass]}${m.subclass ? ` · ${m.subclass}` : ''}` : 'Sem classe')

function MemberRow({ member }: { member: Member }) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-1 py-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 font-bold text-gold">{member.name[0]?.toUpperCase()}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{member.name}</span>
        <span className="block truncate text-sm text-muted">{classText(member)}</span>
      </span>
    </li>
  )
}

function MyCard({ me }: { me: Member }) {
  const [name, setName] = useState(me.name)
  const [subclass, setSubclass] = useState(me.subclass ?? '')
  const [error, setError] = useState<string | null>(null)
  const save = async (patch: Parameters<typeof world.updateMe>[0]) => setError(await world.updateMe(patch))

  return (
    <li className="space-y-2 rounded-lg border border-accent/40 bg-bg/40 p-3">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== me.name && void save({ name })}
          maxLength={30}
          aria-label="Seu nome no mundo"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 font-semibold text-ink focus:border-accent focus:outline-none"
        />
        <span className="shrink-0 text-xs text-accent">você</span>
      </div>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Sua classe">
        {(Object.keys(CLASS_LABELS) as PlayerClass[]).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={me.playerClass === c}
            onClick={() => void save({ playerClass: me.playerClass === c ? null : c })}
            className={`rounded-lg border px-2 py-1.5 text-sm transition ${
              me.playerClass === c ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {CLASS_LABELS[c]}
          </button>
        ))}
      </div>
      {me.playerClass && (
        <>
          <input
            value={subclass}
            onChange={(e) => setSubclass(e.target.value)}
            onBlur={() => subclass.trim() !== (me.subclass ?? '') && void save({ subclass })}
            list="subclasses"
            maxLength={40}
            placeholder="Subclasse (opcional, ex.: Ioiôs)"
            aria-label="Subclasse"
            className="h-9 w-full rounded-lg border border-line bg-bg px-2 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <datalist id="subclasses">
            {SUBCLASSES[me.playerClass].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </li>
  )
}

function WorldGroups({ worldId }: { worldId: string }) {
  const groups = useLibrary().groups.filter((g) => g.worldId === worldId)
  return (
    <section className={cardClass}>
      <h2 className="mb-2 flex items-baseline justify-between font-display text-lg font-bold text-gold">
        Grupos do mundo
        <Link to="/grupos" className="font-sans text-sm font-normal text-accent hover:underline">
          Criar / ver todos
        </Link>
      </h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">Nenhum ainda. Em Grupos, escolha “Do mundo” ao criar.</p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/grupos/${g.id}`} className="flex items-center gap-2 rounded-lg px-1 py-1.5 transition hover:bg-bg/50">
                <FolderIcon className="h-5 w-5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                <span className="text-xs text-muted">{g.items.length}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return shortDate(iso)
}

function activityText(a: Activity): React.ReactNode {
  const who = <strong className="text-ink">{a.actorName}</strong>
  switch (a.kind) {
    case 'created':
      return <>{who} criou o mundo</>
    case 'joined':
      return <>{who} entrou no mundo</>
    case 'defeated': {
      const m = a.subject ? milestone(a.subject) : undefined
      return (
        <>
          {who} {m?.kind === 'evento' ? 'venceu' : 'derrotou'} <strong className="text-gold">{m?.pt ?? a.subject}</strong>
        </>
      )
    }
    case 'group_created':
      return (
        <>
          {who} criou o grupo <strong className="text-ink">{a.groupName}</strong>
        </>
      )
    case 'item_added':
      return (
        <>
          {who} adicionou <strong className="text-gold">{a.subjectPt ?? a.subject}</strong> ao grupo <strong className="text-ink">{a.groupName}</strong>
        </>
      )
  }
}

function ActivityList() {
  const { activity } = useWorld()
  return (
    <section className={cardClass}>
      <h2 className="mb-2 font-display text-lg font-bold text-gold">Atividade</h2>
      {activity.length === 0 ? (
        <p className="text-sm text-muted">Nada por aqui ainda.</p>
      ) : (
        <ul className="space-y-2 text-sm text-muted">
          {activity.map((a) => (
            <li key={a.id} className="flex gap-2">
              <span className="min-w-0 flex-1">{activityText(a)}</span>
              <span className="shrink-0 text-xs">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DangerZone({ current }: { current: World }) {
  const { userId } = useWorld()
  const [error, setError] = useState<string | null>(null)
  const isCreator = current.createdBy === userId

  async function leave() {
    if (!window.confirm(`Sair do mundo “${current.name}”? Você pode voltar com o código ${current.inviteCode}.`)) return
    setError(await world.leave(current.id))
  }

  async function remove() {
    if (!window.confirm(`Apagar o mundo “${current.name}” para todos os membros? O progresso e os grupos do mundo somem.`)) return
    setError(await world.remove(current.id))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <GlobeIcon className="h-4 w-4 text-muted" />
      <button type="button" onClick={() => void leave()} className="rounded-full border border-line px-3 py-1.5 text-muted transition hover:border-red-400 hover:text-red-300">
        Sair do mundo
      </button>
      {isCreator && (
        <button type="button" onClick={() => void remove()} className="rounded-full border border-line px-3 py-1.5 text-muted transition hover:border-red-400 hover:text-red-300">
          Apagar mundo
        </button>
      )}
      {error && <p className="w-full text-red-300">{error}</p>}
    </div>
  )
}
