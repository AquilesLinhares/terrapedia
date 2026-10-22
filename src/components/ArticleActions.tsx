import { useState } from 'react'
import { groupHas, isFavorite, isQuick, library, readLaterItem, useLibrary, type ArticleRef } from '../lib/library'
import { quickWindowSupported } from '../lib/quickWindow'
import { ClockIcon, FolderIcon, PinIcon, StarIcon } from './icons'
import GroupPicker from './GroupPicker'

/** Botões "Favorito", "Depois" e "Grupo" no topo de cada artigo. */
export default function ArticleActions({ article }: { article: ArticleRef }) {
  const lib = useLibrary()
  const [pickerOpen, setPickerOpen] = useState(false)
  const favorite = isFavorite(lib, article.page)
  const later = readLaterItem(lib, article.page)
  const groupCount = lib.groups.filter((g) => groupHas(g, article.page)).length
  const pinned = isQuick(lib, article.page)

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        active={favorite}
        onClick={() => library.toggleFavorite(article)}
        label={favorite ? 'Favorito' : 'Favoritar'}
        title={favorite ? 'Tirar dos favoritos' : 'Adicionar aos favoritos'}
        icon={<StarIcon className="h-4.5 w-4.5" filled={favorite} />}
      />
      <ActionButton
        active={!!later}
        onClick={() => library.toggleReadLater(article)}
        label={later ? 'Na lista' : 'Ver depois'}
        title={later ? 'Tirar da lista "Buscar depois"' : 'Salvar em "Buscar depois"'}
        icon={<ClockIcon className="h-4.5 w-4.5" filled={!!later} />}
      />
      <ActionButton
        active={groupCount > 0}
        onClick={() => setPickerOpen(true)}
        label={groupCount > 0 ? `Grupos (${groupCount})` : 'Grupo'}
        title="Adicionar a um grupo"
        icon={<FolderIcon className="h-4.5 w-4.5" filled={groupCount > 0} />}
      />
      <ActionButton
        active={pinned}
        onClick={() => library.toggleQuick(article)}
        label={pinned ? 'Fixado' : 'Fixar'}
        title={
          pinned
            ? 'Tirar do acesso rápido'
            : quickWindowSupported
              ? 'Fixar no acesso rápido (janelinha flutuante)'
              : 'Fixar no acesso rápido (a janelinha flutuante abre no Chrome ou Edge do PC)'
        }
        icon={<PinIcon className="h-4.5 w-4.5" filled={pinned} />}
      />
      {pickerOpen && <GroupPicker article={article} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}

interface ActionButtonProps {
  active: boolean
  onClick: () => void
  label: string
  title: string
  icon: React.ReactNode
}

function ActionButton({ active, onClick, label, title, icon }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition active:scale-95 ${
        active ? 'border-gold/60 bg-gold/15 text-gold' : 'border-line bg-panel text-ink/90 hover:border-accent'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
