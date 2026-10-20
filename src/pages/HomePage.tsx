import { Link } from 'react-router-dom'
import SearchBar, { articlePath } from '../components/SearchBar'

const QUICK_LINKS = ['Zenith', 'Moon Lord', 'Guide', 'Pickaxes', 'Bosses', 'Biomes', 'Crafting stations', 'Hardmode']

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-[18vh] pb-16">
      <img src="/icon.svg" alt="" className="mb-4 h-20 w-20 drop-shadow-[0_0_24px_rgba(242,201,76,0.35)]" />
      <h1 className="font-display text-4xl font-bold text-gold sm:text-5xl">Terrapedia</h1>
      <p className="mt-2 mb-8 text-center text-muted">A wiki do Terraria, com cara nova.</p>

      <SearchBar autoFocus large />

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {QUICK_LINKS.map((title) => (
          <Link
            key={title}
            to={articlePath(title)}
            className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-ink/90 transition hover:border-accent hover:text-ink"
          >
            {title}
          </Link>
        ))}
      </div>
    </div>
  )
}
