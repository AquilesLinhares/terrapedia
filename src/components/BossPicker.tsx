import { useSearchParams } from 'react-router-dom'
import { BOSS_PREP, type BossPrep } from '../lib/bossPrep'
import { milestone, STAGES } from '../lib/progression'
import { useDefeated, useToolStage } from '../lib/toolsData'
import { selectClass } from './ToolsUI'

/**
 * Chefe escolhido (`?chefe=` na URL). Sem escolha: o primeiro ainda não derrotado no mundo ativo; sem mundo,
 * o primeiro enfrentado na etapa escolhida nas ferramentas.
 */
export function useBoss(): [BossPrep, (key: string) => void] {
  const [params, setParams] = useSearchParams()
  const defeated = useDefeated()
  const { stage } = useToolStage()
  const index = (id: string) => STAGES.findIndex((s) => s.id === id)
  const chosen = BOSS_PREP.find((b) => b.key === params.get('chefe'))
  const fallback = defeated
    ? BOSS_PREP.find((b) => !defeated.has(b.key))
    : BOSS_PREP.find((b) => index(b.fight) >= index(stage))
  return [chosen ?? fallback ?? BOSS_PREP[BOSS_PREP.length - 1], (key) => setParams({ chefe: key }, { replace: true })]
}

/** Lista de chefes (com ícone do mapa e ✓ nos já derrotados no mundo ativo). */
export function BossPicker({ boss, onChange }: { boss: BossPrep; onChange: (key: string) => void }) {
  const defeated = useDefeated()
  const m = milestone(boss.key)!
  return (
    <div className="flex items-center gap-3">
      <img src={m.icon} alt="" className="pixelated h-12 w-12 shrink-0 object-contain" />
      <label className="min-w-0 flex-1">
        <span className="sr-only">Chefe</span>
        <select value={boss.key} onChange={(e) => onChange(e.target.value)} className={`${selectClass} w-full font-display text-lg font-bold text-gold`}>
          {BOSS_PREP.map((b) => (
            <option key={b.key} value={b.key}>
              {defeated?.has(b.key) ? '✓ ' : ''}
              {milestone(b.key)?.pt}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">
          {boss.key} · costuma ser enfrentado em: {STAGES.find((s) => s.id === boss.fight)?.label}
        </span>
      </label>
    </div>
  )
}
