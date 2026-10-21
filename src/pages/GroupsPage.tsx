import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { library, useLibrary, type Group } from '../lib/library'
import { activeWorld, useWorld } from '../lib/world'
import { EmptyState, PageHeading } from '../components/PageHeading'
import { FolderIcon, PlusIcon } from '../components/icons'

export default function GroupsPage() {
  const { groups } = useLibrary()
  const current = activeWorld(useWorld())
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)

  useEffect(() => {
    document.title = 'Grupos · Terrapedia'
  }, [])

  // Grupos do mundo ativo podem ter mudado em outro aparelho
  const currentId = current?.id
  useEffect(() => {
    if (currentId) library.refresh()
  }, [currentId])

  function createGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    navigate(`/grupos/${library.createGroup(name, shared && current ? current.id : undefined)}`)
  }

  const personal = groups.filter((g) => !g.worldId)
  const worldGroups = current ? groups.filter((g) => g.worldId === current.id) : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeading title="Grupos" subtitle="Junte artigos por objetivo, como “Preparar Moon Lord”." />

      <form onSubmit={createGroup} className="mb-5 space-y-2">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do novo grupo"
            aria-label="Nome do novo grupo"
            maxLength={60}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-panel px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-accent px-4 text-sm font-semibold text-bg transition disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            Criar
          </button>
        </div>
        {current && (
          <div className="flex rounded-full border border-line bg-panel p-0.5 text-sm" role="group" aria-label="Tipo do grupo">
            {[
              { value: false, label: 'Pessoal' },
              { value: true, label: 'Do mundo' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={shared === o.value}
                onClick={() => setShared(o.value)}
                className={`min-w-0 flex-1 truncate rounded-full px-3 py-1.5 transition ${
                  shared === o.value ? 'bg-gold/15 font-semibold text-gold' : 'text-muted hover:text-ink'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </form>

      {current && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Do mundo · {current.name}</h2>
          {worldGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-4 text-sm text-muted">
              Nenhum grupo do mundo ainda. Escolha “Do mundo” acima para criar um que todos os membros veem.
            </p>
          ) : (
            <GroupList groups={worldGroups} />
          )}
        </section>
      )}

      {current && <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Pessoais</h2>}
      {personal.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-10 w-10" />}>
          Crie um grupo aqui em cima, ou abra um artigo e toque em <strong className="text-ink">Grupo</strong>.
        </EmptyState>
      ) : (
        <GroupList groups={personal} />
      )}
    </div>
  )
}

function GroupList({ groups }: { groups: Group[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((g) => (
        <li key={g.id}>
          <Link
            to={`/grupos/${g.id}`}
            className="flex h-full items-center gap-3 rounded-xl border border-line bg-panel px-3 py-3 transition hover:border-accent"
          >
            <FolderIcon className={`h-6 w-6 shrink-0 ${g.worldId ? 'text-accent' : 'text-gold'}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{g.name}</span>
              <span className="block text-sm text-muted">{g.items.length} artigo(s)</span>
            </span>
            {/* Prévia: os primeiros sprites do grupo */}
            <span className="flex shrink-0 -space-x-2">
              {g.items
                .filter((i) => i.sprite)
                .slice(0, 3)
                .map((i) => (
                  <span key={i.page} className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-bg">
                    <img src={i.sprite} alt="" className="pixelated max-h-6 max-w-6 object-contain" loading="lazy" />
                  </span>
                ))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
