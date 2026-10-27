import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  buildTree,
  computeTotals,
  craftChoices,
  NO_CRAFT,
  useCraftChoices,
  type TreeNode,
} from '../lib/craftTree'
import { ptName, treeRecipes, useRecipeBook, type Recipe, type RecipeBook } from '../lib/recipes'
import ItemChip, { Sprite } from '../components/ItemChip'
import { Station } from '../components/RecipeList'
import { articlePath } from '../components/SearchBar'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import { useCraftChecks } from '../lib/craftChecks'
import { activeWorld, useWorld } from '../lib/world'

/** Até que profundidade a árvore começa aberta (raiz = 0). */
const DEFAULT_DEPTH = 2

/** Atalhos de itens que juntam vários acessórios/itens (nomes EN, como no recipes.json). */
const BIG_COMBOS = [
  'Terraspark Boots',
  'Ankh Shield',
  'Shellphone',
  'Celestial Shell',
  'Hand Of Creation',
  'Bundle of Horseshoe Balloons',
  'Zenith',
]

export default function CraftingTreePage() {
  const { '*': rawItem = '' } = useParams()
  const item = rawItem.replace(/_/g, ' ')
  const book = useRecipeBook()
  const choices = useCraftChoices()
  const [qty, setQty] = useState(1)
  // Abrir/fechar: profundidade padrão + o que a pessoa abriu/fechou na mão
  const [openDepth, setOpenDepth] = useState(DEFAULT_DEPTH)
  const [toggled, setToggled] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    document.title = `Árvore: ${item} · Terrapedia`
    window.scrollTo(0, 0)
    setOpenDepth(DEFAULT_DEPTH)
    setToggled(new Map())
  }, [item])

  // Checklist "já tenho": salvo no mundo ativo (todos veem) ou neste aparelho
  const checks = useCraftChecks(item)
  const worldName = activeWorld(useWorld())?.name
  const have = checks.checked
  const tree = useMemo(() => (book ? buildTree(book, choices, item, qty, have) : null), [book, choices, item, qty, have])
  const totals = useMemo(() => (book ? computeTotals(book, choices, item, qty, have) : null), [book, choices, item, qty, have])

  if (!book || !tree || !totals) {
    return <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 text-muted">Carregando receitas…</div>
  }

  if (treeRecipes(book, item).length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted">
        <p>“{ptName(book, item)}” não tem receita de crafting: é um material básico.</p>
        <Link to={articlePath(item)} className="mt-3 inline-block font-semibold text-accent hover:underline">
          Abrir o artigo
        </Link>
      </div>
    )
  }

  const missing = totals.materials.filter((m) => !m.have).length
  const isOpen = (node: TreeNode, depth: number) => toggled.get(node.key) ?? depth < openDepth
  const toggle = (node: TreeNode, depth: number) => setToggled(new Map(toggled).set(node.key, !isOpen(node, depth)))
  const setAll = (depth: number) => {
    setOpenDepth(depth)
    setToggled(new Map())
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to={articlePath(item)} className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition hover:text-accent">
        <ChevronLeftIcon className="h-4 w-4" />
        Artigo
      </Link>

      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Sprite book={book} name={item} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Árvore de crafting</p>
            <h1 className="font-display text-2xl font-bold break-words text-gold sm:text-3xl">{ptName(book, item)}</h1>
            {ptName(book, item) !== item && <p className="text-sm text-muted">{item}</p>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Quantidade
          <input
            type="number"
            min={1}
            max={9999}
            value={qty}
            onChange={(e) => setQty(Math.min(9999, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            className="h-9 w-20 rounded-lg border border-line bg-panel px-2 text-base text-ink focus:border-accent focus:outline-none"
          />
        </label>
      </header>

      <nav aria-label="Grandes combinações" className="mb-5">
        <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">Grandes combinações</p>
        <ul className="flex flex-wrap gap-1.5">
          {BIG_COMBOS.filter((n) => treeRecipes(book, n).length > 0).map((n) => (
            <li key={n}>
              <Link
                to={`/arvore/${encodeURIComponent(n.replace(/ /g, '_'))}`}
                aria-current={n === item ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1.5 text-sm transition hover:no-underline ${
                  n === item ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-panel text-ink/90 hover:border-accent'
                }`}
              >
                <Sprite book={book} name={n} size="sm" />
                {ptName(book, n)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 lg:order-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ToolbarButton onClick={() => setAll(Infinity)}>Expandir tudo</ToolbarButton>
            <ToolbarButton onClick={() => setAll(1)}>Recolher tudo</ToolbarButton>
          </div>
          <ul className="rounded-xl border border-line bg-panel/60 p-2 sm:p-3">
            <TreeRow book={book} node={tree} depth={0} isOpen={isOpen} toggle={toggle} have={have} onHave={checks.toggle} />
          </ul>
          <p className="mt-2 text-xs text-muted">
            Escolhas de receita e de item (ex.: Ferro ou Chumbo) valem para a árvore toda e ficam salvas neste aparelho.
          </p>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <SummaryBox title="Materiais totais">
            <p className="mb-2 text-xs text-muted">
              {missing === 0
                ? 'Você já tem tudo!'
                : `Faltam ${missing} de ${totals.materials.length}. Marque o que já tem.`}
            </p>
            <ul className="space-y-1.5">
              {totals.materials.map((m) => (
                <li key={m.name} className={`flex items-center gap-2 ${m.have ? 'opacity-55' : ''}`}>
                  <HaveCheck checked={m.have} onToggle={() => checks.toggle(m.name)} name={ptName(book, m.name)} />
                  <span className={`w-10 shrink-0 text-right font-semibold tabular-nums ${m.have ? 'text-muted line-through' : 'text-gold'}`}>
                    {m.qty}
                  </span>
                  <ItemChip book={book} name={m.name} size="sm" showEn={false} />
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2 text-xs text-muted">
              {checks.worldId ? (
                <>
                  Marcações do mundo <strong className="text-ink">{worldName}</strong>: todos os membros veem.
                </>
              ) : (
                'Marcações salvas neste aparelho. Com um mundo ativo, ficam no mundo.'
              )}
              {checks.checked.size > 0 && (
                <button type="button" onClick={checks.clear} className="ml-1 font-semibold text-accent hover:underline">
                  Desmarcar tudo
                </button>
              )}
            </p>
          </SummaryBox>

          <SummaryBox title="Bancadas">
            <ul className="space-y-1.5 text-sm">
              {totals.stations.map((s) => (
                <li key={s} className="flex flex-wrap items-center gap-1.5">
                  <Station book={book} station={s} />
                </li>
              ))}
            </ul>
          </SummaryBox>

          {totals.crafted.length > 0 && (
            <SummaryBox title={`Ordem de crafting (${totals.crafted.length + 1})`}>
              <ol className="space-y-1.5 text-sm">
                {[...totals.crafted].reverse().map((c) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right font-semibold text-gold tabular-nums">{c.qty}</span>
                    <ItemChip book={book} name={c.name} size="sm" showEn={false} />
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-right font-semibold text-gold tabular-nums">{qty}</span>
                  <ItemChip book={book} name={item} size="sm" showEn={false} highlight />
                </li>
              </ol>
            </SummaryBox>
          )}
        </aside>
      </div>
    </div>
  )
}

interface RowProps {
  book: RecipeBook
  node: TreeNode
  depth: number
  isOpen: (node: TreeNode, depth: number) => boolean
  toggle: (node: TreeNode, depth: number) => void
  /** Checklist "já tenho" */
  have: Set<string>
  onHave: (name: string) => void
}

function TreeRow({ book, node, depth, isOpen, toggle, have, onHave }: RowProps) {
  const options = treeRecipes(book, node.name)
  const members = node.group ? (book.groups.get(node.group) ?? []) : []
  const open = node.children.length > 0 && isOpen(node, depth)

  return (
    <li>
      <div className="flex items-start gap-1.5 rounded-lg py-1 pr-1 hover:bg-bg/40">
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => toggle(node, depth)}
            aria-expanded={open}
            aria-label={open ? 'Recolher' : 'Expandir'}
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-panel-2 hover:text-ink"
          >
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {depth > 0 && <HaveCheck checked={have.has(node.name)} onToggle={() => onHave(node.name)} name={ptName(book, node.name)} />}
            <span
              className={`text-right font-semibold tabular-nums sm:min-w-8 ${have.has(node.name) ? 'text-muted line-through' : 'text-gold'}`}
            >
              {node.qty}×
            </span>
            <ItemChip book={book} name={node.name} showEn={false} />
            {node.recipe && node.recipe.amount > 1 && (
              <span className="text-xs text-muted">
                ({node.crafts} receita{node.crafts > 1 ? 's' : ''} de {node.recipe.amount})
              </span>
            )}
          </div>

          {(node.recipe || node.group || options.length > 1 || node.loop) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-1 text-xs text-muted">
              {node.recipe && (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  em <Station book={book} station={node.recipe.station} />
                </span>
              )}
              {node.group && members.length > 1 && (
                <Choice
                  label={ptName(book, node.group)}
                  value={node.name}
                  onChange={(v) => craftChoices.setGroupItem(node.group!, v)}
                  options={members.map((m) => ({ value: m, label: ptName(book, m) }))}
                />
              )}
              {!node.loop && options.length > 1 && (
                <Choice
                  label="Receita"
                  value={String(node.recipe?.id ?? NO_CRAFT)}
                  onChange={(v) => craftChoices.setRecipe(node.name, Number(v))}
                  options={[
                    ...options.map((r, i) => ({ value: String(r.id), label: `${i + 1}. ${recipeLabel(book, r)}` })),
                    { value: String(NO_CRAFT), label: 'Não craftar (contar como material)' },
                  ]}
                />
              )}
              {node.loop && <span className="italic">já aparece acima neste ramo</span>}
            </div>
          )}
        </div>
      </div>

      {open && (
        <ul className="ml-2.5 border-l border-line/70 pl-1 sm:ml-4 sm:pl-3">
          {node.children.map((child) => (
            <TreeRow key={child.key} book={book} node={child} depth={depth + 1} isOpen={isOpen} toggle={toggle} have={have} onHave={onHave} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** "Barra de Ferro ×10 + Madeira ×3" (para a lista de receitas). */
function recipeLabel(book: RecipeBook, r: Recipe) {
  const text = r.ingredients.map((i) => `${ptName(book, i.name)}${i.amount > 1 ? ` ×${i.amount}` : ''}`).join(' + ')
  return text.length > 70 ? `${text.slice(0, 68)}…` : text
}

interface ChoiceProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function Choice({ label, value, onChange, options }: ChoiceProps) {
  return (
    <label className="inline-flex max-w-full items-center gap-1.5">
      <span className="shrink-0">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 max-w-[16rem] min-w-0 truncate rounded-md border border-line bg-panel-2 px-1.5 text-xs text-ink focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Caixinha "já tenho" do checklist. */
function HaveCheck({ checked, onToggle, name }: { checked: boolean; onToggle: () => void; name: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      title={checked ? `Desmarcar: ainda não tenho ${name}` : `Já tenho ${name}`}
      aria-label={`Já tenho ${name}`}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
        checked ? 'border-gold bg-gold text-bg' : 'border-line bg-bg/50 text-transparent hover:border-accent'
      }`}
    >
      <CheckIcon className="h-4 w-4" />
    </button>
  )
}

function ToolbarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-full border border-line bg-panel px-3 text-sm text-ink/90 transition hover:border-accent"
    >
      {children}
    </button>
  )
}

function SummaryBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <h2 className="mb-2 font-display text-lg font-bold text-gold">{title}</h2>
      {children}
    </div>
  )
}
