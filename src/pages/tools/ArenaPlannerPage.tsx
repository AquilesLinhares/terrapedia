import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BossPicker, useBoss } from '../../components/BossPicker'
import { RichText } from '../../components/GuideView'
import ItemChip from '../../components/ItemChip'
import { articlePath } from '../../components/SearchBar'
import { cardClass, Loading, ToolHeader } from '../../components/ToolsUI'
import { inStage } from '../../lib/bossPrep'
import { milestone } from '../../lib/progression'
import { useRecipeBook } from '../../lib/recipes'

/** `/ferramentas/arena?chefe=...`: o que montar para cada chefe, tamanho sugerido e dicas. */
export default function ArenaPlannerPage() {
  const book = useRecipeBook()
  const [boss, setBoss] = useBoss()
  const pt = milestone(boss.key)?.pt

  useEffect(() => {
    document.title = 'Planejador de arena · Terrapedia'
  }, [])

  const build = boss.arena.build.filter((it) => inStage(it, boss.fight))

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader title="Planejador de arena" subtitle="O que construir antes de chamar cada chefe, o tamanho e dicas rápidas." />
      <div className="space-y-5">
        <section className={cardClass}>
          <BossPicker boss={boss} onChange={setBoss} />
        </section>

        {!book ? (
          <Loading />
        ) : (
          <>
            <section className={`${cardClass} border-gold/40`}>
              <h2 className="mb-1 font-display text-lg font-bold text-gold">Tamanho sugerido</h2>
              <p className="text-ink">
                <RichText text={boss.arena.size} book={book} />
              </p>
            </section>

            <section className={cardClass}>
              <h2 className="mb-2 font-display text-lg font-bold text-ink">O que montar</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {build.map((it) => (
                  <li key={it.name} className="min-w-0">
                    <ItemChip book={book} name={it.name} />
                    {it.note && (
                      <p className="mt-0.5 ml-10 text-sm text-muted">
                        <RichText text={it.note} book={book} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className={cardClass}>
              <h2 className="mb-2 font-display text-lg font-bold text-ink">Dicas</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-ink marker:text-gold">
                {boss.arena.tips.map((tip) => (
                  <li key={tip}>
                    <RichText text={tip} book={book} />
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <Link to={`/ferramentas/buffs?chefe=${encodeURIComponent(boss.key)}`} className="text-accent hover:underline">
                Checklist de buffs para {pt}
              </Link>
              <Link to={articlePath(boss.key)} className="text-accent hover:underline">
                Página de {pt}
              </Link>
              <Link to={articlePath('Guide:Arenas')} className="text-accent hover:underline">
                Guia de arenas da wiki
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
