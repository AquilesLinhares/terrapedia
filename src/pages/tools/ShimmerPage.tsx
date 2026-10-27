import { useEffect, useMemo, useState } from 'react'
import { RichText } from '../../components/GuideView'
import ItemChip from '../../components/ItemChip'
import { cardClass, Loading, StagePicker, ToolHeader } from '../../components/ToolsUI'
import { normalize } from '../../lib/ptSearch'
import { stageAtLeast, STAGES, type StageId } from '../../lib/progression'
import { ptName, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { AETHER, BOOSTS, HOW_TO, SHIMMER_CHECK_COUNT, SWAP_GROUPS, type Swap } from '../../lib/shimmer'
import { useToolStage } from '../../lib/toolsData'

function Check({ why }: { why: string }) {
  return (
    <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300" title={why}>
      conferir
    </span>
  )
}

function StageTag({ min, stage }: { min?: StageId; stage: StageId }) {
  if (!min || stageAtLeast(stage, min)) return null
  const label = STAGES.find((s) => s.id === min)?.label
  return <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300">só a partir de: {label}</span>
}

function SwapRow({ book, swap, stage }: { book: RecipeBook; swap: Swap; stage: StageId }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <ItemChip book={book} name={swap.from} size="sm" />
      <span className="text-muted" aria-label="vira">
        →
      </span>
      <ItemChip book={book} name={swap.to} size="sm" />
      <span className="flex flex-wrap items-center gap-1.5">
        {swap.note && <span className="text-xs text-muted">{swap.note}</span>}
        <StageTag min={swap.minStage} stage={stage} />
        {swap.check && <Check why={swap.check} />}
      </span>
    </li>
  )
}

/** `/ferramentas/shimmer`: o que o Brilho dá de melhorias permanentes, o que dá para trocar nele e como achar o Éter. */
export default function ShimmerPage() {
  const book = useRecipeBook()
  const { stage } = useToolStage()
  const [q, setQ] = useState('')

  useEffect(() => {
    document.title = 'Guia do Brilho · Terrapedia'
  }, [])

  const term = normalize(q.trim())
  const groups = useMemo(() => {
    if (!book || !term) return SWAP_GROUPS
    const hit = (n: string) => normalize(n).includes(term) || normalize(ptName(book, n)).includes(term)
    return SWAP_GROUPS.map((g) => ({ ...g, swaps: g.swaps.filter((s) => hit(s.from) || hit(s.to)) })).filter((g) => g.swaps.length > 0)
  }, [book, term])

  const header = <ToolHeader title="Guia do Brilho" subtitle="Melhorias permanentes, o que dá para trocar no Brilho e como achar o Éter." />
  if (!book)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        {header}
        <Loading />
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {header}
      <div className="space-y-5">
        <section className={cardClass}>
          <StagePicker />
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-lg font-bold text-ink">Melhorias permanentes</h2>
          <p className="mt-1 text-xs text-muted">
            Itens que só existem pelo Brilho. Cada um se usa uma vez por personagem (o Peddler’s Satchel, uma vez no mundo).
          </p>
          <ul className="mt-2 divide-y divide-line">
            {BOOSTS.map((b) => (
              <li key={b.item} className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ItemChip book={book} name={b.item} />
                  <span className="text-muted">←</span>
                  <ItemChip book={book} name={b.from} size="sm" />
                  <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-muted">{b.scope === 'world' ? 'do mundo' : 'do personagem'}</span>
                  <StageTag min={b.minStage} stage={stage} />
                  {b.check && <Check why={b.check} />}
                </div>
                <p className="text-sm text-ink/90">
                  <RichText text={b.effect} book={book} />
                </p>
                {b.check && <p className="text-xs text-amber-300">Conferir: {b.check}.</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-lg font-bold text-ink">Como trocar itens</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink/90">
            {HOW_TO.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-ink">Trocas</h2>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar item (português ou inglês)"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          {groups.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Nenhuma troca com esse item.</p>}
          {groups.map((g) => (
            <div key={g.id} className={cardClass}>
              <h3 className="font-display font-bold text-gold">{g.title}</h3>
              <p className="mt-1 text-sm text-muted">{g.intro}</p>
              <ul className="mt-2 divide-y divide-line">
                {g.swaps.map((s) => (
                  <SwapRow key={`${s.from}>${s.to}`} book={book} swap={s} stage={stage} />
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-lg font-bold text-ink">Como achar o Éter</h2>
          <p className="mt-1 text-sm text-ink/90">{AETHER.intro}</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink/90">
            {AETHER.steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg bg-bg/50 p-3 text-sm">
            <p className="font-semibold text-gold">Posição na Bússola (em pés; 1 bloco = 2 pés)</p>
            <p className="text-xs text-muted">
              Troque n pelo número do nome do Guia. Selva à esquerda usa a primeira fórmula; à direita, a segunda.
            </p>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 pr-2 font-normal">Mundo</th>
                  <th className="py-1 pr-2 font-normal">Selva à esquerda</th>
                  <th className="py-1 font-normal">Selva à direita</th>
                </tr>
              </thead>
              <tbody>
                {AETHER.formulas.map((f) => (
                  <tr key={f.size} className="border-t border-line">
                    <td className="py-1 pr-2">{f.size}</td>
                    <td className="py-1 pr-2 tabular-nums">{f.left}</td>
                    <td className="py-1 tabular-nums">{f.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Valor de n: {AETHER.guideNames.map(([name, n]) => `${name} ${n}`).join(' · ')}… <Check why={AETHER.guideNamesCheck} />
            </p>
          </div>
        </section>

        <p className="text-xs text-muted">
          Fonte: páginas “Shimmer”, “Aether” e “Crate” da Terraria Wiki (Terraria 1.4.5, lidas em 27/10/2026), resumidas com nossas
          palavras. Itens marcados “conferir” não foram confirmados ({SHIMMER_CHECK_COUNT}).
        </p>
      </div>
    </div>
  )
}
