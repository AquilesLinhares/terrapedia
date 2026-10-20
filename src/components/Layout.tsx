import { Link, Outlet, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'

export default function Layout() {
  const isHome = useLocation().pathname === '/'

  return (
    <div className="flex min-h-dvh flex-col">
      {!isHome && (
        <header className="sticky top-0 z-40 border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Início">
              <img src="/icon.svg" alt="" className="h-8 w-8" />
              <span className="hidden font-display text-xl font-bold text-gold sm:inline">Terrapedia</span>
            </Link>
            <SearchBar />
          </div>
        </header>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        Conteúdo da{' '}
        <a href="https://terraria.wiki.gg" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          Terraria Wiki
        </a>{' '}
        sob licença{' '}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/3.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          CC BY-NC-SA 3.0
        </a>
        . Terrapedia é um projeto de fãs, sem fins lucrativos e sem ligação com a Re-Logic.
      </footer>
    </div>
  )
}
