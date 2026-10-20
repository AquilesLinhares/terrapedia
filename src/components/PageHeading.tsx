import { Link } from 'react-router-dom'

/** Título das páginas da biblioteca + mensagem quando a lista está vazia. */
export function PageHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold text-gold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}

export function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-10 text-center text-muted">
      <span className="mb-3 text-line">{icon}</span>
      <p className="max-w-sm text-sm">{children}</p>
      <Link to="/" className="mt-4 text-sm font-semibold text-accent hover:underline">
        Buscar um artigo
      </Link>
    </div>
  )
}
