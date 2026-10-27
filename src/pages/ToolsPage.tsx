import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sprite } from '../components/ItemChip'
import { PageHeading } from '../components/PageHeading'
import { useRecipeBook } from '../lib/recipes'

// Ferramentas de jogo. `ready: false` aparece como "em breve".
export const TOOLS = [
  {
    slug: 'lacaios',
    title: 'Calculadora de lacaios',
    text: 'Some as vagas de lacaio e sentinela da sua armadura, acessórios e poções.',
    icon: 'Summoning Potion',
    ready: true,
  },
  {
    slug: 'modificador',
    title: 'Melhor modificador',
    text: 'Qual modificador buscar ao reforjar uma arma ou acessório, e por quê.',
    icon: 'Reforge.png',
    ready: true,
  },
  {
    slug: 'buffs',
    title: 'Checklist de buffs',
    text: 'Poções, comidas e estações para cada chefe, com caixinhas salvas no mundo.',
    icon: 'Ironskin Potion',
    ready: true,
  },
  {
    slug: 'arena',
    title: 'Planejador de arena',
    text: 'O que montar para cada chefe, tamanho sugerido e dicas curtas.',
    icon: 'Heart Lantern',
    ready: true,
  },
  {
    slug: 'comparar',
    title: 'Comparador de itens',
    text: 'Dois ou três itens lado a lado: dano, velocidade, efeitos e como conseguir.',
    icon: 'Terra Blade',
    ready: true,
  },
  {
    slug: 'felicidade',
    title: 'Felicidade dos NPCs',
    text: 'Monte as casas: quem fica feliz em cada bioma, o preço de cada um e os Pilones liberados.',
    icon: 'Forest Pylon',
    ready: true,
  },
  {
    slug: 'vendedores',
    title: 'Vendedores',
    text: 'O que cada NPC vende, quando e por quanto, como ele chega e quem vende tal item.',
    icon: 'Piggy Bank',
    ready: true,
  },
  {
    slug: 'condicoes',
    title: 'Condições de chefes e eventos',
    text: 'Como invocar cada chefe e evento, onde, quando vem sozinho e o que já dá para fazer no seu mundo.',
    icon: 'Suspicious Looking Eye',
    ready: true,
  },
  {
    slug: 'drops',
    title: 'Farm de drops',
    text: 'Quem dropa cada item, a chance, quantos abates para 50% / 90% / 99% e um contador de tentativas.',
    icon: 'Lucky Coin',
    ready: true,
  },
  {
    slug: 'shimmer',
    title: 'Guia do Brilho',
    text: 'Melhorias permanentes, trocas de itens (minérios, caixas, emblemas) e como achar o Éter.',
    icon: 'Bottomless Shimmer Bucket',
    ready: true,
  },
  {
    slug: 'pescaria',
    title: 'Pescaria',
    text: 'Peixes de poção e de missão por bioma e camada, caixas (antes e depois do Modo Difícil) e recompensas do Pescador.',
    icon: 'Golden Fishing Rod',
    ready: true,
  },
]

/** Página `/ferramentas`: cartões das ferramentas de jogo. */
export default function ToolsPage() {
  const book = useRecipeBook()

  useEffect(() => {
    document.title = 'Ferramentas · Terrapedia'
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeading
        title="Ferramentas"
        subtitle="Calculadoras e listas para o combate, os NPCs e o mundo. Usam a etapa e a classe do seu mundo ativo quando dá."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const body = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg/60">
                {tool.icon.endsWith('.png') ? (
                  <img src={`https://terraria.wiki.gg/images/${tool.icon}`} alt="" className="pixelated max-h-9 max-w-9" />
                ) : (
                  book && <Sprite book={book} name={tool.icon} size="md" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold text-gold">{tool.title}</span>
                  {!tool.ready && <span className="rounded-full bg-bg/70 px-2 py-0.5 text-xs text-muted">em breve</span>}
                </span>
                <span className="block text-sm text-muted">{tool.text}</span>
              </span>
            </>
          )
          return (
            <li key={tool.slug}>
              {tool.ready ? (
                <Link
                  to={`/ferramentas/${tool.slug}`}
                  className="flex h-full items-center gap-3 rounded-xl border border-line bg-panel p-4 transition hover:border-accent hover:no-underline"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex h-full items-center gap-3 rounded-xl border border-dashed border-line p-4 opacity-60">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
