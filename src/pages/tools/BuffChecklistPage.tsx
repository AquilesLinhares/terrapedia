import { useEffect, useState } from 'react'
import { BossPicker, useBoss } from '../../components/BossPicker'
import { RichText } from '../../components/GuideView'
import ItemChip from '../../components/ItemChip'
import { cardClass, ClassPicker, Loading, ToolHeader } from '../../components/ToolsUI'
import { BUFF_GROUPS, inStage, type PrepItem } from '../../lib/bossPrep'
import { useBuffChecks } from '../../lib/buffChecks'
import { milestone } from '../../lib/progression'
import { useRecipeBook, type RecipeBook } from '../../lib/recipes'
import { useDefeated, useToolClass } from '../../lib/toolsData'
import { activeWorld, CLASS_LABELS, useWorld, type PlayerClass } from '../../lib/world'

/** `/ferramentas/buffs?chefe=...`: poções, comidas e estações para um chefe, com caixinhas. */
export default function BuffChecklistPage() {
  const book = useRecipeBook()
  const [boss, setBoss] = useBoss()
  const { playerClass, setClass } = useToolClass()
  const [allClasses, setAllClasses] = useState(false)
  const checks = useBuffChecks(boss.key)
  const defeated = useDefeated()
  const world = activeWorld(useWorld())

  useEffect(() => {
    document.title = 'Checklist de buffs · Terrapedia'
  }, [])

  const visible = (it: PrepItem) => inStage(it, boss.fight) && (!it.class || allClasses || !playerClass || it.class === playerClass)
  const groups = BUFF_GROUPS.map((g) => ({ ...g, items: g.items.filter(visible) }))
  if (boss.extra) groups.unshift({ id: 'extra', title: `Só para ${milestone(boss.key)?.pt}`, items: boss.extra })
  const all = groups.flatMap((g) => g.items.map((i) => i.name))
  const done = all.filter((n) => checks.checked.has(n)).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ToolHeader title="Checklist de buffs" subtitle="Tudo o que vale preparar antes de cada chefe. Marque o que já está pronto." />
      <div className="space-y-5">
        <section className={`${cardClass} space-y-3`}>
          <BossPicker boss={boss} onChange={setBoss} />
          <div className="flex flex-wrap items-center gap-2">
            <ClassPicker value={playerClass} onChange={setClass} />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={allClasses} onChange={(e) => setAllClasses(e.target.checked)} className="h-4 w-4 accent-gold" />
              Mostrar todas as classes
            </label>
          </div>
          {!playerClass && <p className="text-xs text-muted">Escolha a sua classe para ver poções e estações dela.</p>}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            <span className="font-display text-2xl font-bold text-gold">
              {done}/{all.length}
            </span>{' '}
            <span className="text-muted">prontos</span>
          </span>
          <span className="text-xs text-muted">
            {checks.worldId ? `Salvo no mundo ${world?.name ?? ''} (todos os membros veem)` : 'Salvo só neste aparelho'}
            {done > 0 && (
              <button type="button" onClick={() => confirm('Desmarcar tudo deste chefe?') && checks.clear()} className="ml-3 text-muted underline hover:text-ink">
                Limpar
              </button>
            )}
          </span>
        </div>

        {!book ? (
          <Loading />
        ) : (
          groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.id} className={cardClass}>
                <h2 className="mb-2 font-display text-lg font-bold text-ink">
                  {g.id === 'class' && playerClass && !allClasses ? `Da sua classe (${CLASS_LABELS[playerClass]})` : g.title}
                </h2>
                <ul className="divide-y divide-line/60">
                  {g.items.map((it) => (
                    <CheckRow
                      key={it.name}
                      book={book}
                      item={it}
                      checked={checks.checked.has(it.name)}
                      onToggle={() => checks.toggle(it.name)}
                      missing={it.needs && defeated && !defeated.has(it.needs) ? milestone(it.needs)?.pt : undefined}
                      showClass={allClasses ? it.class : undefined}
                    />
                  ))}
                </ul>
              </section>
            ))
        )}
        <p className="text-xs text-muted">
          A lista muda com a etapa em que o chefe costuma ser enfrentado: poções melhores substituem as fracas.
        </p>
      </div>
    </div>
  )
}

function CheckRow({
  book,
  item,
  checked,
  onToggle,
  missing,
  showClass,
}: {
  book: RecipeBook
  item: PrepItem
  checked: boolean
  onToggle: () => void
  missing?: string
  showClass?: PlayerClass
}) {
  return (
    <li className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Pronto: ${item.name}`}
        className="mt-2 h-5 w-5 shrink-0 accent-gold"
      />
      <div className={`min-w-0 flex-1 ${checked ? 'opacity-60' : ''}`}>
        <ItemChip book={book} name={item.name} />
        {(item.note || missing || showClass) && (
          <p className="mt-0.5 ml-10 text-sm text-muted">
            {showClass && <span className="mr-1.5 text-accent">{CLASS_LABELS[showClass]} ·</span>}
            {item.note && <RichText text={item.note} book={book} />}
            {missing && <span className="ml-1.5 text-gold">(depois de {missing})</span>}
          </p>
        )}
      </div>
    </li>
  )
}
