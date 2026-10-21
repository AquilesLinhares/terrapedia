import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Guide, ItemGroup, ItemRef, Section, Text } from '../lib/guides'
import { pageFor, ptName, spriteUrl, type RecipeBook } from '../lib/recipes'
import CraftingSection, { craftingFor } from './CraftingSection'
import { Sprite } from './ItemChip'
import RecipeList from './RecipeList'
import { articlePath } from './SearchBar'

// Títulos fixos das seções de cada tipo, na ordem em que aparecem
const SECTION_TITLES = {
  evento: { natural: 'Quando acontece sozinho', summon: 'Como invocar', effects: 'O que acontece', enemies: 'Inimigos', drops: 'Drops' },
  chefe: { summon: 'Como invocar', where: 'Onde lutar', prep: 'Preparação recomendada', phases: 'Ataques e fases', drops: 'Drops' },
  item: { what: 'O que faz', obtain: 'Como conseguir', crafting: 'Crafting', usedIn: 'Usado em' },
} as const

/** Ids das seções começam com "resumo-" (o resto dos "#..." é da página completa da wiki). */
const sectionId = (key: string) => `resumo-${key}`

/** Página reorganizada: resumo, ficha rápida e seções fixas do tipo. */
export default function GuideView({ guide, book }: { guide: Guide; book: RecipeBook }) {
  const crafting = guide.type === 'item' ? craftingFor(book, guide.page) : null
  const titles: Record<string, string> = SECTION_TITLES[guide.type]

  // Seções que vão aparecer (as de crafting só se houver receita, uso ou observação)
  const sections: { key: string; title: string; body: ReactNode }[] = []
  for (const [key, title] of Object.entries(titles)) {
    let body: ReactNode = null
    if (key === 'phases' && guide.type === 'chefe') {
      body = <Phases phases={guide.phases} book={book} />
    } else if (key === 'crafting' && guide.type === 'item') {
      const recipes = crafting && crafting.recipes.length > 0
      if (recipes || guide.crafting) {
        body = (
          <>
            {recipes && <CraftingSection book={book} crafting={crafting} only="recipes" />}
            {guide.crafting && <SectionBody section={guide.crafting} book={book} />}
          </>
        )
      }
    } else if (key === 'usedIn' && guide.type === 'item') {
      const uses = crafting && crafting.uses.length > 0
      if (uses || guide.usedIn) {
        body = (
          <>
            {guide.usedIn && <SectionBody section={guide.usedIn} book={book} />}
            {uses && <CraftingSection book={book} crafting={crafting} only="uses" />}
          </>
        )
      }
    } else {
      const section = (guide as unknown as Record<string, Section | undefined>)[key]
      if (section) body = <SectionBody section={section} book={book} />
    }
    if (body) sections.push({ key, title, body })
  }
  if (guide.tips?.length) sections.push({ key: 'tips', title: 'Dicas', body: <Bullets texts={guide.tips} book={book} /> })

  return (
    <div className="wiki-content guide">
      <p className="mt-0 text-lg leading-relaxed text-ink">
        <RichText text={guide.summary} book={book} />
      </p>

      {guide.facts && guide.facts.length > 0 && (
        <dl className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {guide.facts.map((f) => (
            <div key={f.label} className="rounded-lg border border-line bg-panel/70 px-3 py-2">
              <dt className="text-xs font-medium tracking-wide text-muted uppercase">{f.label}</dt>
              <dd className="m-0! mt-0.5! text-sm text-ink">
                <RichText text={f.value} book={book} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Atalhos para as seções (rolam para o lado no celular) */}
      <nav className="-mx-4 mt-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Seções">
        {sections.map((s) => (
          <a
            key={s.key}
            href={`#${sectionId(s.key)}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(sectionId(s.key))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="shrink-0 rounded-full border border-line bg-panel px-3 py-1 text-sm text-ink/90 transition hover:border-accent hover:no-underline"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {sections.map((s) => (
        <section key={s.key}>
          <h2 id={sectionId(s.key)}>{s.title}</h2>
          {s.body}
        </section>
      ))}
    </div>
  )
}

function SectionBody({ section, book }: { section: Section; book: RecipeBook }) {
  return (
    <>
      {section.text && <Bullets texts={section.text} book={book} />}
      {section.groups?.map((g, i) => <Group key={i} group={g} book={book} />)}
      {section.recipesOf?.map((name) => {
        const recipes = book.byResult.get(name) ?? []
        return (
          recipes.length > 0 && (
            <div key={name} className="crafting-app">
              <h3>Receita: {ptName(book, name)}</h3>
              <RecipeList book={book} recipes={recipes} />
            </div>
          )
        )
      })}
    </>
  )
}

/** Um texto vira parágrafo; vários viram lista. */
function Bullets({ texts, book }: { texts: Text[]; book: RecipeBook }) {
  if (texts.length === 1) {
    return (
      <p>
        <RichText text={texts[0]} book={book} />
      </p>
    )
  }
  return (
    <ul>
      {texts.map((t, i) => (
        <li key={i}>
          <RichText text={t} book={book} />
        </li>
      ))}
    </ul>
  )
}

function Group({ group, book }: { group: ItemGroup; book: RecipeBook }) {
  return (
    <div className="my-3">
      {group.label && (
        <h3 className="mt-4! mb-2! font-sans! text-sm! font-semibold! tracking-wide! text-muted! uppercase">
          <RichText text={group.label} book={book} />
        </h3>
      )}
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
        {group.items.map((item) => (
          <GuideItem key={typeof item === 'string' ? item : item.name} item={item} book={book} />
        ))}
      </div>
    </div>
  )
}

/** Cartão de item: sprite + nome PT + nome EN, com quantidade e observação. */
function GuideItem({ item, book }: { item: ItemRef; book: RecipeBook }) {
  const { name, qty, note } = typeof item === 'string' ? { name: item, qty: undefined, note: undefined } : item
  const pt = ptName(book, name)
  return (
    <Link
      to={articlePath(pageFor(name))}
      className="group flex min-w-0 items-center gap-2 rounded-lg border border-line/70 bg-panel/60 px-2 py-1.5 text-sm sm:gap-2.5 sm:px-2.5 sm:text-base transition hover:border-accent hover:no-underline!"
    >
      <Sprite book={book} name={name} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="font-medium text-accent group-hover:underline">{pt}</span>
        {qty && <span className="ml-1.5 rounded bg-bg/70 px-1.5 text-xs font-semibold text-gold">×{qty}</span>}
        {pt !== name && <span className="block truncate text-xs text-muted">{name}</span>}
        {note && (
          <span className="block text-xs text-ink/70">
            <RichText text={note} book={book} />
          </span>
        )}
      </span>
    </Link>
  )
}

function Phases({ phases, book }: { phases: { name: string; text: Text[] }[]; book: RecipeBook }) {
  return (
    <ol className="m-0! list-none! space-y-3 p-0!">
      {phases.map((phase, i) => (
        <li key={i} className="m-0! rounded-lg border border-line bg-panel/60 px-4 py-3">
          <h3 className="mt-0! mb-1! text-lg!">{phase.name}</h3>
          <ul className="my-0!">
            {phase.text.map((t, j) => (
              <li key={j}>
                <RichText text={t} book={book} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

// [[Nome]], [[Nome|texto]] ou **negrito**
const MARKUP = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*(.+?)\*\*/g

/** Desenha o texto com as marcações de `Text` (itens clicáveis e negrito). */
export function RichText({ text, book }: { text: Text; book: RecipeBook }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(MARKUP)) {
    parts.push(text.slice(last, m.index))
    const [, name, label, bold] = m
    parts.push(
      bold !== undefined ? (
        <strong key={m.index} className="font-semibold text-ink">
          <RichText text={bold} book={book} />
        </strong>
      ) : (
        <InlineRef key={m.index} name={name} label={label} book={book} />
      ),
    )
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts.map((p, i) => (typeof p === 'string' ? <Fragment key={`t${i}`}>{p}</Fragment> : p))}</>
}

/** Item no meio do texto: sprite pequeno + nome PT (ou o texto dado) + nome EN discreto. */
function InlineRef({ name, label, book }: { name: string; label?: string; book: RecipeBook }) {
  const pt = ptName(book, name)
  const shown = label ?? pt
  const url = spriteUrl(book, name)
  return (
    <Link to={articlePath(pageFor(name))} className="group hover:no-underline!">
      {url && (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="pixelated mr-1 inline-block max-h-5! w-auto! align-[-0.2em]"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
      <span className="group-hover:underline">{shown}</span>
      {shown.toLowerCase() !== name.toLowerCase() && <span className="ml-1 text-xs text-muted">{name}</span>}
    </Link>
  )
}
