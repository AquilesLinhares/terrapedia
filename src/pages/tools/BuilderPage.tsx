import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { articlePath } from '../../components/SearchBar'
import { CheckIcon, TrashIcon } from '../../components/icons'
import ItemChip from '../../components/ItemChip'
import RecipeList, { Station } from '../../components/RecipeList'
import { cardClass, ItemPicker, Loading, StagePicker, ToolHeader } from '../../components/ToolsUI'
import {
  buildCatalog,
  builderPlan,
  BUILDER_CHECK_LIST,
  KIND_LABELS,
  stationMinStage,
  useBuilderChecks,
  useBuilderPlan,
  type BuildKind,
} from '../../lib/builderPlan'
import { computeTotals, useCraftChoices } from '../../lib/craftTree'
import { stageAtLeast, STAGES } from '../../lib/progression'
import { ptName, treeRecipes, useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useToolsData, useToolStage, type ToolsData } from '../../lib/toolsData'

function Check({ why }: { why: string }) {
  return (
    <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300" title={why}>
      conferir
    </span>
  )
}

/** De onde vem um item sem receita, só com o que os dados têm (vendedor e drops); senão, "conferir". */
function SourceInfo({ name, tools }: { name: string; tools: ToolsData | null }) {
  const vendors = tools?.vendors[name]
  const drops = tools?.drops[name]
  if (!tools) return null
  if (!vendors?.length && !drops?.length)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <Check why="Sem receita nem vendedor/drop nos dados do app" />
        <Link to={articlePath(name)} className="text-accent hover:underline">
          ver na wiki
        </Link>
      </span>
    )
  return (
    <span className="text-xs text-muted">
      {vendors?.length ? `Vendido por: ${vendors.join(', ')}. ` : ''}
      {drops?.length ? `Dropa de: ${drops.slice(0, 3).map((d) => d[0]).join(', ')}${drops.length > 3 ? '…' : ''}.` : ''}
    </span>
  )
}

function HowToGet({ book, name, tools, stage }: { book: RecipeBook; name: string; tools: ToolsData | null; stage: ReturnType<typeof useToolStage>['stage'] }) {
  const recipes = treeRecipes(book, name)
  const late = recipes.filter((r) => {
    const min = stationMinStage(r.station)
    return min && !stageAtLeast(stage, min)
  })
  if (recipes.length === 0)
    return (
      <div className="mt-2 space-y-1 text-sm">
        <p className="text-muted">Sem receita nos dados.</p>
        <SourceInfo name={name} tools={tools} />
      </div>
    )
  return (
    <div className="mt-1">
      <RecipeList book={book} recipes={recipes} limit={3} />
      {late.length > 0 && (
        <p className="text-xs text-amber-300">
          {late.length === recipes.length ? 'Todas as receitas pedem' : 'Algumas receitas pedem'} bancada de etapa mais adiante:{' '}
          {[...new Set(late.map((r) => STAGES.find((s) => s.id === stationMinStage(r.station))?.label))].join(', ')}.
        </p>
      )}
    </div>
  )
}

/** `/ferramentas/construtor`: monta a lista do que construir e soma os materiais. */
export default function BuilderPage() {
  const book = useRecipeBook()
  const tools = useToolsData()
  const { stage } = useToolStage()
  const choices = useCraftChoices()
  const plan = useBuilderPlan()
  const { checked, worldId, toggle, clear } = useBuilderChecks(BUILDER_CHECK_LIST)
  const [kind, setKind] = useState<BuildKind | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Modo construtor · Terrapedia'
  }, [])

  const catalog = useMemo(() => (book ? buildCatalog(book) : []), [book])
  const names = useMemo(() => catalog.filter((c) => kind === 'all' || c.kind === kind).map((c) => c.name), [catalog, kind])

  const planned = Object.entries(plan)
  const totals = useMemo(() => {
    if (!book) return null
    const materials = new Map<string, number>()
    const crafted = new Map<string, number>()
    const stations = new Set<string>()
    for (const [name, qty] of planned) {
      const t = computeTotals(book, choices, name, qty, checked)
      t.materials.forEach((m) => materials.set(m.name, (materials.get(m.name) ?? 0) + m.qty))
      t.crafted.forEach((c) => crafted.set(c.name, (crafted.get(c.name) ?? 0) + c.qty))
      t.stations.forEach((s) => stations.add(s))
    }
    const list = [...materials].map(([name, qty]) => ({ name, qty, have: checked.has(name) }))
    list.sort((a, b) => Number(a.have) - Number(b.have) || b.qty - a.qty)
    return { materials: list, crafted: [...crafted].sort((a, b) => b[1] - a[1]), stations: [...stations] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, choices, checked, plan])

  const header = <ToolHeader title="Modo construtor" subtitle="Monte a lista do que vai construir e veja quanto material precisa." />
  if (!book)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        {header}
        <Loading />
      </div>
    )

  const done = totals?.materials.filter((m) => m.have).length ?? 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {header}
      <div className="space-y-5">
        <section className={cardClass}>
          <StagePicker />
        </section>

        <section className={`${cardClass} space-y-3`}>
          <h2 className="font-display text-lg font-bold text-ink">Buscar blocos e paredes</h2>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
            {(['all', 'block', 'wall', 'platform', 'material'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  kind === k ? 'border-gold bg-gold/15 font-semibold text-gold' : 'border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                {k === 'all' ? 'Tudo' : KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <ItemPicker book={book} names={names} onPick={(n) => builderPlan.add(n)} placeholder="Buscar bloco ou parede (português ou inglês)" />
          <p className="text-xs text-muted">Escolher um item o coloca na lista com 100. Mude a quantidade na lista.</p>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-ink">O que vou construir</h2>
            {planned.length > 0 && (
              <button type="button" onClick={() => confirm('Esvaziar a lista?') && builderPlan.clear()} className="ml-auto text-sm text-muted hover:text-ink">
                Esvaziar lista
              </button>
            )}
          </div>
          {planned.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
              A lista está vazia. Busque um bloco ou parede acima.
            </p>
          )}
          <ul className="space-y-2">
            {planned.map(([name, qty]) => (
              <li key={name} className={cardClass}>
                <div className="flex flex-wrap items-center gap-3">
                  <ItemChip book={book} name={name} />
                  <label className="ml-auto flex items-center gap-2 text-sm text-muted">
                    Quantidade
                    <input
                      type="number"
                      min={1}
                      max={99999}
                      value={qty}
                      onChange={(e) => builderPlan.set(name, Number(e.target.value))}
                      className="h-10 w-24 rounded-lg border border-line bg-bg px-2 text-right text-ink focus:border-accent focus:outline-none"
                    />
                  </label>
                  <button type="button" onClick={() => setOpen(open === name ? null : name)} className="text-sm text-accent hover:underline">
                    {open === name ? 'Fechar' : 'Como conseguir'}
                  </button>
                  <button type="button" onClick={() => builderPlan.remove(name)} className="p-2 text-muted hover:text-ink" aria-label={`Tirar ${ptName(book, name)} da lista`}>
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                {open === name && <HowToGet book={book} name={name} tools={tools} stage={stage} />}
              </li>
            ))}
          </ul>
        </section>

        {totals && planned.length > 0 && (
          <section className={`${cardClass} space-y-3`}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-bold text-ink">Lista de materiais</h2>
              <span className="text-sm text-muted">
                {done}/{totals.materials.length} já tenho
              </span>
              {done > 0 && (
                <button type="button" onClick={clear} className="ml-auto text-sm text-muted hover:text-ink">
                  Desmarcar tudo
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              {worldId ? 'Marcações salvas no mundo ativo: todos os membros veem.' : 'Marcações salvas só neste aparelho (entre num mundo para dividir com a dupla).'} Itens
              marcados não são abertos em receitas.
            </p>
            <ul className="divide-y divide-line">
              {totals.materials.map((m) => (
                <li key={m.name} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${m.have ? 'opacity-50' : ''}`}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={m.have}
                    aria-label={`Já tenho ${ptName(book, m.name)}`}
                    onClick={() => toggle(m.name)}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${m.have ? 'border-gold bg-gold/20 text-gold' : 'border-line'}`}
                  >
                    {m.have && <CheckIcon className="h-4 w-4" />}
                  </button>
                  <span className={m.have ? 'line-through' : ''}>
                    <ItemChip book={book} name={m.name} amount={m.qty} />
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-gold">{m.qty}</span>
                  {!m.have && treeRecipes(book, m.name).length === 0 && <SourceInfo name={m.name} tools={tools} />}
                </li>
              ))}
            </ul>

            {totals.crafted.length > 0 && (
              <details className="rounded-lg bg-bg/50 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-ink">O que craftar no caminho ({totals.crafted.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {totals.crafted.map(([name, qty]) => (
                    <li key={name}>
                      <ItemChip book={book} name={name} amount={qty} size="sm" showEn={false} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {totals.stations.length > 0 && (
              <div className="rounded-lg bg-bg/50 p-3 text-sm">
                <p className="mb-1.5 font-semibold text-ink">Bancadas</p>
                <ul className="space-y-1.5">
                  {totals.stations.map((s) => {
                    const min = stationMinStage(s)
                    return (
                      <li key={s} className="flex flex-wrap items-center gap-1.5">
                        <Station book={book} station={s} />
                        {min && !stageAtLeast(stage, min) && (
                          <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-amber-300">
                            só a partir de: {STAGES.find((x) => x.id === min)?.label}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-muted">
          Receitas da Terraria Wiki (Terraria 1.4.5). Itens sem receita nos dados aparecem como “conferir”. Cada item da lista é somado
          separado: quem tem várias receitas pode sobrar um pouco de material.
        </p>
      </div>
    </div>
  )
}
