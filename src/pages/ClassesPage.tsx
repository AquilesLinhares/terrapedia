import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sprite } from '../components/ItemChip'
import { PageHeading } from '../components/PageHeading'
import { CLASS_LIST, hasClassGuide } from '../lib/classGuides'
import { useRecipeBook } from '../lib/recipes'
import { CLASS_LABELS, useWorld } from '../lib/world'

const BLURB = {
  melee: 'Muita defesa e dano de perto.',
  ranged: 'Arcos e armas de fogo, dano alto de longe.',
  magic: 'Feitiços variados, frágil mas versátil.',
  summoner: 'Lacaios, sentinelas e chicotes que lutam por você.',
} as const

/** Lista das classes (`/classes`). A sua classe no mundo ativo aparece marcada. */
export default function ClassesPage() {
  const book = useRecipeBook()
  const state = useWorld()
  const mine = state.members.find((m) => m.userId === state.userId)?.playerClass

  useEffect(() => {
    document.title = 'Guias de classe · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeading title="Guias de classe" subtitle="O que usar em cada etapa do jogo, do começo ao Senhor da Lua." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {CLASS_LIST.map(({ class: c, slug, emblem }) => {
          const ready = hasClassGuide(c)
          const body = (
            <>
              {book && <Sprite book={book} name={emblem} size="lg" />}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl font-bold text-gold">{CLASS_LABELS[c]}</span>
                  {mine === c && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">sua classe</span>}
                  {!ready && <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-muted">em breve</span>}
                </span>
                <span className="block text-sm text-muted">{BLURB[c]}</span>
              </span>
            </>
          )
          return (
            <li key={c}>
              {ready ? (
                <Link to={`/classes/${slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 transition hover:border-accent hover:no-underline">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-4 opacity-60">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
