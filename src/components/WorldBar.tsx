import { Link, useLocation } from 'react-router-dom'
import { activeWorld, MODE_LABELS, useWorld, useWorldStage } from '../lib/world'
import { ChevronRightIcon, GlobeIcon } from './icons'

/** Faixa fina no topo com o mundo ativo e a etapa atual (só com login e um mundo). */
export default function WorldBar() {
  const current = activeWorld(useWorld())
  const stage = useWorldStage()
  const onWorldPage = useLocation().pathname === '/mundo'
  if (!current || onWorldPage) return null

  return (
    <Link
      to="/mundo"
      className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-1.5 text-xs text-muted transition hover:text-ink"
    >
      <GlobeIcon className="h-4 w-4 shrink-0 text-accent" />
      <span className="min-w-0 truncate">
        <strong className="font-semibold text-ink">{current.name}</strong>
        <span className="mx-1.5">·</span>
        {MODE_LABELS[current.mode]}
        {stage && (
          <>
            <span className="mx-1.5">·</span>
            <span className="text-gold">{stage.label}</span>
          </>
        )}
      </span>
      <ChevronRightIcon className="ml-auto h-3.5 w-3.5 shrink-0" />
    </Link>
  )
}
