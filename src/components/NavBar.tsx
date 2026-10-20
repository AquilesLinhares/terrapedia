import { NavLink } from 'react-router-dom'
import { useLibrary } from '../lib/library'
import { ClockIcon, FolderIcon, HomeIcon, StarIcon } from './icons'

function useNavItems() {
  const lib = useLibrary()
  const unseen = lib.readLater.filter((r) => !r.seen).length
  return [
    { to: '/favoritos', label: 'Favoritos', short: 'Favoritos', icon: StarIcon, badge: 0 },
    { to: '/depois', label: 'Buscar depois', short: 'Depois', icon: ClockIcon, badge: unseen },
    { to: '/grupos', label: 'Grupos', short: 'Grupos', icon: FolderIcon, badge: 0 },
  ]
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
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
      {items.map(({ to, label, icon: Icon, badge }) => (
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
                <Badge count={badge} />
              </span>
              <span className="hidden lg:inline">{label}</span>
            </>
          )}
        </NavLink>
      ))}
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
      <div className="grid grid-cols-4">
        {[{ to: '/', label: 'Início', short: 'Início', icon: HomeIcon, badge: 0 }, ...items].map(({ to, short, icon: Icon, badge }) => (
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
                  <Badge count={badge} />
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
