import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { library, useLibrary } from '../lib/library'
import { EmptyState } from '../components/PageHeading'
import SavedArticleRow, { RowButton } from '../components/SavedArticleRow'
import { ChevronLeftIcon, FolderIcon, PencilIcon, TrashIcon } from '../components/icons'

export default function GroupPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const group = useLibrary().groups.find((g) => g.id === id)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    document.title = `${group?.name ?? 'Grupo'} · Terrapedia`
  }, [group?.name])

  if (!group) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted">
        <p>Esse grupo não existe (talvez tenha sido apagado).</p>
        <Link to="/grupos" className="mt-3 inline-block font-semibold text-accent hover:underline">
          Ver meus grupos
        </Link>
      </div>
    )
  }

  function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) library.renameGroup(group!.id, name)
    setEditing(false)
  }

  function deleteGroup() {
    if (!window.confirm(`Apagar o grupo “${group!.name}”? Os artigos continuam na wiki, só o grupo some.`)) return
    library.deleteGroup(group!.id)
    navigate('/grupos', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/grupos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition hover:text-accent">
        <ChevronLeftIcon className="h-4 w-4" />
        Grupos
      </Link>

      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <form onSubmit={saveName} className="flex min-w-0 flex-1 gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              maxLength={60}
              aria-label="Nome do grupo"
              className="h-11 min-w-0 flex-1 rounded-xl border border-accent bg-panel px-3 font-display text-xl font-bold text-gold focus:outline-none"
            />
          </form>
        ) : (
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold break-words text-gold">{group.name}</h1>
            <p className="mt-1 text-sm text-muted">{group.items.length} artigo(s)</p>
          </div>
        )}
        {!editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setName(group.name)
                setEditing(true)
              }}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm text-muted transition hover:border-accent hover:text-ink"
            >
              <PencilIcon className="h-4 w-4" />
              Renomear
            </button>
            <button
              type="button"
              onClick={deleteGroup}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm text-muted transition hover:border-red-400 hover:text-red-300"
            >
              <TrashIcon className="h-4 w-4" />
              Apagar
            </button>
          </div>
        )}
      </header>

      {group.items.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-10 w-10" />}>
          Grupo vazio. Abra um artigo e toque em <strong className="text-ink">Grupo</strong> para colocá-lo aqui.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {group.items.map((item) => (
            <SavedArticleRow
              key={item.page}
              article={item}
              trailing={
                <RowButton onClick={() => library.toggleInGroup(group.id, item)} label="Tirar do grupo">
                  <TrashIcon className="h-5 w-5" />
                </RowButton>
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
