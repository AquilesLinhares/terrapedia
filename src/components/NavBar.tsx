import { NavLink } from 'react-router-dom'
import { useLibrary, useSyncStatus } from '../lib/library'
import { ClockIcon, FolderIcon, GlobeIcon, HomeIcon, StarIcon, UserIcon, WrenchIcon } from './icons'
import { QuickWindowButton } from './QuickWindow'

function useNavItems() {
  const lib = useLibrary()
  const unseen = lib.readLater.filter((r) => !r.seen).length
  const { state, importOffer } = useSyncStatus()
  return [
    { to: '/favoritos', label: 'Favoritos', short: 'Favoritos', icon: StarIcon, badge: 0 },
    { to: '/depois', label: 'Buscar depois', short: 'Depois', icon: ClockIcon, badge: unseen },
    { to: '/grupos', label: 'Grupos', short: 'Grupos', icon: FolderIcon, badge: 0 },
    { to: '/mundo', label: 'Meu mundo', short: 'Mundo', icon: GlobeIcon, badge: 0 },
    { to: '/ferramentas', label: 'Ferramentas', short: 'Ferram.', icon: WrenchIcon, badge: 0 },
    // Ponto no ícone: há algo para importar ou mudanças que ainda não foram enviadas
    { to: '/conta', label: 'Conta', short: 'Conta', icon: UserIcon, badge: 0, dot: importOffer !== null || state === 'offline' },
  ]
}

function Badge({ count, dot }: { count: number; dot?: boolean }) {
  if (count === 0) return dot ? <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-gold" /> : null
  return (
    <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] leading-4 font-bold text-bg">
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Links no topo (PC/tablet). */
export function TopNav() {
  const items = useNavItems()
  return (
    <nav className="hidden shrink-0 items-center gap-1 sm:flex" aria-label="Minha biblioteca">
      {items.map(({ to, label, icon: Icon, badge, dot }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            `flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition ${
              isActive ? 'bg-gold/15 text-gold' : 'text-muted hover:bg-panel hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon className="h-5 w-5" filled={isActive} />
                <Badge count={badge} dot={dot} />
              </span>
              <span className="hidden xl:inline">{label}</span>
            </>
          )}
        </NavLink>
      ))}
      <QuickWindowButton />
    </nav>
  )
}

/** Barra fixa no rodapé (celular): fácil de alcançar com o polegar. */
export function BottomNav() {
  const items = useNavItems()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Navegação"
    >
      <div className="grid grid-cols-7">
        {[{ to: '/', label: 'Início', short: 'Início', icon: HomeIcon, badge: 0 }, ...items].map(({ to, short, icon: Icon, badge, dot }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                isActive ? 'text-gold' : 'text-muted active:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon className="h-6 w-6" filled={isActive} />
                  <Badge count={badge} dot={dot} />
                </span>
                {short}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
