import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { canDeleteGroup, hasLink, library, useLibrary, type Group, type SavedArticle } from '../lib/library'
import { useWorld } from '../lib/world'
import { useRecipeBook } from '../lib/recipes'
import { EmptyState } from '../components/PageHeading'
import SavedArticleRow, { RowButton } from '../components/SavedArticleRow'
import GroupLinkPicker, { suggestedLinks } from '../components/GroupLinkPicker'
import { ChevronLeftIcon, FolderIcon, LinkIcon, ListIcon, PencilIcon, TrashIcon, TreeIcon } from '../components/icons'

export default function GroupPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const group = useLibrary().groups.find((g) => g.id === id)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [view, setView] = useState<'list' | 'tree'>('list')
  const [linking, setLinking] = useState<SavedArticle | null>(null)
  const book = useRecipeBook()

  const worldName = useWorld().worlds.find((w) => w.id === group?.worldId)?.name

  useEffect(() => {
    document.title = `${group?.name ?? 'Grupo'} · Terrapedia`
  }, [group?.name])

  // Grupo do mundo: outros membros podem ter mudado
  const isWorldGroup = !!group?.worldId
  useEffect(() => {
    if (isWorldGroup) library.refresh()
  }, [isWorldGroup])

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

  // Ligações que as receitas sugerem e ainda não foram feitas
  const suggestions = book ? suggestedLinks(book, group).filter((l) => !hasLink(group, l.from, l.to)) : []

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
            <p className="mt-1 text-sm text-muted">
              {group.worldId && <span className="mr-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Do mundo{worldName ? ` · ${worldName}` : ''}</span>}
              {group.items.length} artigo(s)
            </p>
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
            {canDeleteGroup(group) && (
            <button
              type="button"
              onClick={deleteGroup}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm text-muted transition hover:border-red-400 hover:text-red-300"
            >
              <TrashIcon className="h-4 w-4" />
              Apagar
            </button>
            )}
          </div>
        )}
      </header>

      {group.items.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-panel p-0.5" role="group" aria-label="Modo de ver">
            <ViewButton active={view === 'list'} onClick={() => setView('list')} icon={<ListIcon className="h-4 w-4" />}>
              Lista
            </ViewButton>
            <ViewButton active={view === 'tree'} onClick={() => setView('tree')} icon={<TreeIcon className="h-4 w-4" />}>
              Árvore
            </ViewButton>
          </div>
          {suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => library.addLinks(group.id, suggestions)}
              title="Liga os itens do grupo conforme as receitas da wiki"
              className="flex h-9 items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 text-sm text-gold transition hover:bg-gold/20"
            >
              <LinkIcon className="h-4 w-4" />
              Ligar pelas receitas ({suggestions.length})
            </button>
          )}
        </div>
      )}

      {group.items.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-10 w-10" />}>
          Grupo vazio. Abra um artigo e toque em <strong className="text-ink">Grupo</strong> para colocá-lo aqui.
        </EmptyState>
      ) : view === 'tree' ? (
        <GroupTree group={group} onLink={setLinking} />
      ) : (
        <ul className="space-y-2">
          {group.items.map((item) => (
            <SavedArticleRow
              key={item.page}
              article={item}
              trailing={
                <>
                  {group.items.length > 1 && <LinkButton group={group} item={item} onClick={() => setLinking(item)} />}
                  <RowButton onClick={() => library.toggleInGroup(group.id, item)} label="Tirar do grupo">
                    <TrashIcon className="h-5 w-5" />
                  </RowButton>
                </>
              }
            />
          ))}
        </ul>
      )}

      {linking && <GroupLinkPicker group={group} item={linking} book={book} onClose={() => setLinking(null)} />}
    </div>
  )
}

/** Botão "Ligar" de um item, com quantos itens ele ajuda a craftar. */
function LinkButton({ group, item, onClick }: { group: Group; item: SavedArticle; onClick: () => void }) {
  const count = group.links.filter((l) => l.from === item.page).length
  return (
    <button
      type="button"
      onClick={onClick}
      title="Usar este item para craftar outro do grupo"
      aria-label="Ligar a outro item"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:bg-bg/50 ${
        count ? 'text-gold' : 'text-muted hover:text-ink'
      }`}
    >
      <LinkIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 min-w-4 rounded-full bg-gold px-1 text-[10px] leading-4 font-bold text-bg">{count}</span>
      )}
    </button>
  )
}

/**
 * Árvore montada à mão: no topo ficam os itens que não são usados para craftar nada do grupo;
 * embaixo de cada um, os itens ligados a ele ("uso X para craftar Y" → X fica embaixo de Y).
 */
function GroupTree({ group, onLink }: { group: Group; onLink: (item: SavedArticle) => void }) {
  const byPage = new Map(group.items.map((i) => [i.page, i]))
  const roots = group.items.filter((i) => !group.links.some((l) => l.from === i.page && byPage.has(l.to)))

  function node(item: SavedArticle, ancestors: Set<string>): React.ReactNode {
    const children = group.links
      .filter((l) => l.to === item.page && byPage.has(l.from) && !ancestors.has(l.from))
      .map((l) => byPage.get(l.from)!)
    const next = new Set(ancestors).add(item.page)
    return (
      <li key={item.page}>
        <ul>
          <SavedArticleRow
            article={item}
            trailing={
              <RowButton onClick={() => onLink(item)} label="Usar para craftar outro item">
                <LinkIcon className="h-5 w-5" />
              </RowButton>
            }
          />
        </ul>
        {children.length > 0 && (
          <ul className="mt-2 ml-5 space-y-2 border-l border-line/70 pl-3">{children.map((c) => node(c, next))}</ul>
        )}
      </li>
    )
  }

  return (
    <>
      {group.links.length === 0 && (
        <p className="mb-3 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
          Nenhuma ligação ainda. Toque em <LinkIcon className="inline h-4 w-4" /> num item para dizer em qual outro item ele é
          usado, ou use “Ligar pelas receitas”.
        </p>
      )}
      <ul className="space-y-3">{(roots.length ? roots : group.items.slice(0, 1)).map((r) => node(r, new Set()))}</ul>
    </>
  )
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition ${active ? 'bg-panel-2 text-gold' : 'text-muted hover:text-ink'}`}
    >
      {icon}
      {children}
    </button>
  )
}
