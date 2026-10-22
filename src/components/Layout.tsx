import { Suspense, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import SearchBar from './SearchBar'
import { BottomNav, TopNav } from './NavBar'
import ImportPrompt from './ImportPrompt'
import WorldBar from './WorldBar'
import { QuickWindowHost } from './QuickWindow'

export default function Layout() {
  const isHome = useLocation().pathname === '/'

  // Ctrl+K (ou Cmd+K no Mac) ou "/" abre a busca de qualquer tela
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]')
      const shortcut = (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)
      if (!shortcut) return
      const input = document.querySelector<HTMLInputElement>('[data-search-input]')
      if (!input) return
      e.preventDefault()
      input.focus()
      input.select()
      input.click() // abre a lista (histórico) mesmo se a busca já estava com o foco
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    // pb-14: espaço para a barra de navegação fixa no rodapé do celular
    <div className="flex min-h-dvh flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      {/* Na página inicial o celular não tem cabeçalho (a busca grande já está lá); no PC fica só a navegação */}
      <header
        className={`sticky top-0 z-40 border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur ${
          isHome ? 'hidden border-transparent bg-transparent backdrop-blur-none sm:block' : ''
        }`}
      >
        <div className={`mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 ${isHome ? 'justify-end' : ''}`}>
          {!isHome && (
            <>
              <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Início">
                <img src="/icon.svg" alt="" className="h-8 w-8" />
                <span className="hidden font-display text-xl font-bold text-gold md:inline">Terrapedia</span>
              </Link>
              <SearchBar />
            </>
          )}
          <TopNav />
        </div>
      </header>

      <WorldBar />

      <main className="flex-1">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
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

      <BottomNav />
      <ImportPrompt />
      <QuickWindowHost />
    </div>
  )
}
