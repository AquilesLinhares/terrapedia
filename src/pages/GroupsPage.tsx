import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { library, useLibrary } from '../lib/library'
import { EmptyState, PageHeading } from '../components/PageHeading'
import { FolderIcon, PlusIcon } from '../components/icons'

export default function GroupsPage() {
  const { groups } = useLibrary()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  useEffect(() => {
    document.title = 'Grupos · Terrapedia'
  }, [])

  function createGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    navigate(`/grupos/${library.createGroup(name)}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeading title="Grupos" subtitle="Junte artigos por objetivo, como “Preparar Moon Lord”." />

      <form onSubmit={createGroup} className="mb-5 flex gap-2">
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
      </form>

      {groups.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-10 w-10" />}>
          Crie um grupo aqui em cima, ou abra um artigo e toque em <strong className="text-ink">Grupo</strong>.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                to={`/grupos/${g.id}`}
                className="flex h-full items-center gap-3 rounded-xl border border-line bg-panel px-3 py-3 transition hover:border-accent"
              >
                <FolderIcon className="h-6 w-6 shrink-0 text-gold" />
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
      )}
    </div>
  )
}
