import { useEffect } from 'react'
import { library, useLibrary } from '../lib/library'
import { EmptyState, PageHeading } from '../components/PageHeading'
import SavedArticleRow, { RowButton } from '../components/SavedArticleRow'
import { StarIcon } from '../components/icons'

export default function FavoritesPage() {
  const { favorites } = useLibrary()

  useEffect(() => {
    document.title = 'Favoritos · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeading title="Favoritos" subtitle={favorites.length > 0 ? `${favorites.length} artigo(s)` : undefined} />
      {favorites.length === 0 ? (
        <EmptyState icon={<StarIcon className="h-10 w-10" />}>
          Toque na estrela <strong className="text-ink">Favoritar</strong> no topo de um artigo para guardá-lo aqui.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {favorites.map((f) => (
            <SavedArticleRow
              key={f.page}
              article={f}
              trailing={
                <RowButton onClick={() => library.toggleFavorite(f)} label="Tirar dos favoritos">
                  <StarIcon className="h-5 w-5 text-gold" filled />
                </RowButton>
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
