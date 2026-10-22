import { Link } from 'react-router-dom'
import SearchBar, { articlePath } from '../components/SearchBar'
import { useRecent } from '../lib/recent'
import { QuickWindowCard } from '../components/QuickWindow'

// Atalhos: nome oficial em português (o mesmo do dicionário) e a página da wiki em inglês
const QUICK_LINKS = [
  { page: 'Zenith', label: 'Zênite' },
  { page: 'Moon Lord', label: 'Senhor da Lua' },
  { page: 'Guide', label: 'Guia' },
  { page: 'Pickaxes', label: 'Picaretas' },
  { page: 'Bosses', label: 'Chefes' },
  { page: 'Biomes', label: 'Biomas' },
  { page: 'Crafting stations', label: 'Estações de Criação' },
  { page: 'Hardmode', label: 'Modo Difícil' },
]

export default function HomePage() {
  const recentCount = useRecent().length
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-[18vh] pb-16">
      <img src="/icon.svg" alt="" className="mb-4 h-20 w-20 drop-shadow-[0_0_24px_rgba(242,201,76,0.35)]" />
      <h1 className="font-display text-4xl font-bold text-gold sm:text-5xl">Terrapedia</h1>
      <p className="mt-2 mb-8 text-center text-muted">A wiki do Terraria, com cara nova.</p>

      <SearchBar autoFocus large />
      <p className="mt-3 text-center text-sm text-muted">
        Não sabe o nome? Descreva: “peneira de limo”, “lua vermelha”, “olho gigante”…
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {QUICK_LINKS.map(({ page, label }) => (
          <Link
            key={page}
            to={articlePath(page)}
            title={page}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink/90 transition hover:border-accent hover:text-ink"
          >
            {label}
          </Link>
        ))}
      </div>
      {recentCount > 0 && (
        <Link to="/historico" className="mt-6 text-sm font-semibold text-accent hover:underline">
          Histórico ({recentCount})
        </Link>
      )}
      <QuickWindowCard />
    </div>
  )
}
