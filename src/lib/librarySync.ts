// Leva a biblioteca para as tabelas do Supabase e de volta (usado por library.ts).
//
// `fetchLibrary` lê tudo da conta. `pushChanges` compara dois estados da biblioteca (o último
// que o servidor confirmou e o atual) e envia só a diferença: linhas novas/alteradas vão por
// upsert e as que sumiram são apagadas. Assim as ações em library.ts não precisam saber do banco.

import type { Group, GroupLink, LibraryData, ReadLaterItem, SavedArticle } from './library'
import { supabase } from './supabase'

interface ArticleRow {
  page: string
  en: string
  pt: string | null
  sprite: string | null
  added_at: string
}
interface ReadLaterRow extends ArticleRow {
  seen: boolean
}
interface GroupRow {
  id: string
  name: string
  created_at: string
  world_id: string | null
  user_id: string
}
interface GroupItemRow extends ArticleRow {
  group_id: string
}
interface GroupLinkRow {
  group_id: string
  from_page: string
  to_page: string
}

const toArticle = (r: ArticleRow): SavedArticle => ({
  page: r.page,
  en: r.en,
  pt: r.pt ?? undefined,
  sprite: r.sprite ?? undefined,
  addedAt: r.added_at,
})

const toRow = (userId: string, a: SavedArticle) => ({
  user_id: userId,
  page: a.page,
  en: a.en,
  pt: a.pt ?? null,
  sprite: a.sprite ?? null,
  added_at: a.addedAt,
})

function client() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

/** Joga o erro do Supabase para cima (para quem chamou saber que falhou). */
function check<T>({ data, error }: { data: T | null; error: { message: string } | null }) {
  if (error) throw new Error(error.message)
  return data as T
}

/** Lê a biblioteca inteira da conta logada (o RLS devolve só as linhas dela). */
export async function fetchLibrary(): Promise<LibraryData> {
  const db = client()
  const [favorites, readLater, groups, items, links] = await Promise.all([
    db.from('favorites').select('page, en, pt, sprite, added_at').order('added_at', { ascending: false }),
    db.from('read_later').select('page, en, pt, sprite, added_at, seen').order('added_at', { ascending: false }),
    db.from('groups').select('id, name, created_at, world_id, user_id').order('created_at'),
    db.from('group_items').select('group_id, page, en, pt, sprite, added_at').order('added_at'),
    db.from('group_links').select('group_id, from_page, to_page').order('created_at'),
  ])
  const itemRows = check<GroupItemRow[]>(items)
  // Se a tabela de ligações ainda não foi criada no banco, o resto da biblioteca continua funcionando
  const linkRows = links.error && /group_links/.test(links.error.message) ? [] : check<GroupLinkRow[]>(links)
  return {
    version: 1,
    favorites: check<ArticleRow[]>(favorites).map(toArticle),
    readLater: check<ReadLaterRow[]>(readLater).map((r) => ({ ...toArticle(r), seen: r.seen })),
    groups: check<GroupRow[]>(groups).map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.created_at,
      ...(g.world_id && { worldId: g.world_id, ownerId: g.user_id }),
      items: itemRows.filter((i) => i.group_id === g.id).map(toArticle),
      links: linkRows.filter((l) => l.group_id === g.id).map((l) => ({ from: l.from_page, to: l.to_page })),
    })),
  }
}

/** O que mudou numa lista: itens novos/alterados (`upsert`) e itens que saíram (`removed`). */
function diff<T>(before: T[], after: T[], key: (item: T) => string, same: (a: T, b: T) => boolean) {
  const old = new Map(before.map((item) => [key(item), item]))
  const upsert: T[] = []
  for (const item of after) {
    const prev = old.get(key(item))
    old.delete(key(item))
    if (!prev || !same(prev, item)) upsert.push(item)
  }
  return { upsert, removed: [...old.values()] }
}

const sameArticle = (a: SavedArticle, b: SavedArticle) => a.en === b.en && a.pt === b.pt && a.sprite === b.sprite
const sameReadLater = (a: ReadLaterItem, b: ReadLaterItem) => sameArticle(a, b) && a.seen === b.seen
const sameGroup = (a: Group, b: Group) => a.name === b.name
const byPage = (a: SavedArticle) => a.page
const byId = (g: Group) => g.id
const byLink = (l: GroupLink) => `${l.from}
${l.to}`

/** Envia para o Supabase o que mudou entre `before` (último estado confirmado) e `after`. */
export async function pushChanges(userId: string, before: LibraryData, after: LibraryData) {
  const db = client()
  const favorites = diff(before.favorites, after.favorites, byPage, sameArticle)
  const readLater = diff(before.readLater, after.readLater, byPage, sameReadLater)
  const groups = diff(before.groups, after.groups, byId, sameGroup)
  const oldGroups = new Map(before.groups.map((g) => [g.id, g]))
  const items = after.groups.map((g) => ({ group: g, ...diff(oldGroups.get(g.id)?.items ?? [], g.items, byPage, sameArticle) }))
  const links = after.groups.map((g) => ({ group: g, ...diff(oldGroups.get(g.id)?.links ?? [], g.links, byLink, () => true) }))

  const run = (requests: PromiseLike<{ data: unknown; error: { message: string } | null }>[]) =>
    Promise.all(requests).then((results) => results.forEach(check))
  const pages = (list: SavedArticle[]) => list.map((a) => a.page)

  // Linhas novas são inseridas; as que já existiam só mudam os campos editáveis. Assim, num grupo
  // do mundo, ninguém vira "dono" de um grupo ou item de outro membro (o banco só deixa mudar esses campos).
  const newGroups = groups.upsert.filter((g) => !oldGroups.has(g.id))
  const renamed = groups.upsert.filter((g) => oldGroups.has(g.id))
  const groupName = (g: Group) => g.name.slice(0, 60) || 'Sem nome'

  // 1. Grupos novos ou renomeados primeiro (os itens dependem deles)
  await run([
    ...(newGroups.length
      ? [
          db.from('groups').upsert(
            newGroups.map((g) => ({ id: g.id, user_id: userId, name: groupName(g), created_at: g.createdAt, world_id: g.worldId ?? null })),
            { ignoreDuplicates: true },
          ),
        ]
      : []),
    ...renamed.map((g) => db.from('groups').update({ name: groupName(g) }).eq('id', g.id)),
  ])

  // 2. Itens apagados e itens novos/alterados
  await run([
    ...(favorites.removed.length ? [db.from('favorites').delete().in('page', pages(favorites.removed))] : []),
    ...(readLater.removed.length ? [db.from('read_later').delete().in('page', pages(readLater.removed))] : []),
    ...items
      .filter((i) => i.removed.length)
      .map((i) => db.from('group_items').delete().eq('group_id', i.group.id).in('page', pages(i.removed))),
    ...links.flatMap((l) =>
      l.removed.map((link) =>
        db.from('group_links').delete().eq('group_id', l.group.id).eq('from_page', link.from).eq('to_page', link.to),
      ),
    ),
  ])
  await run([
    ...(favorites.upsert.length ? [db.from('favorites').upsert(favorites.upsert.map((f) => toRow(userId, f)))] : []),
    ...(readLater.upsert.length
      ? [db.from('read_later').upsert(readLater.upsert.map((r) => ({ ...toRow(userId, r), seen: r.seen })))]
      : []),
    ...items.flatMap((i) => {
      const before = new Set((oldGroups.get(i.group.id)?.items ?? []).map(byPage))
      const added = i.upsert.filter((a) => !before.has(a.page))
      const changed = i.upsert.filter((a) => before.has(a.page))
      return [
        ...(added.length
          ? [db.from('group_items').upsert(added.map((a) => ({ ...toRow(userId, a), group_id: i.group.id })), { ignoreDuplicates: true })]
          : []),
        ...changed.map((a) =>
          db.from('group_items').update({ en: a.en, pt: a.pt ?? null, sprite: a.sprite ?? null }).eq('group_id', i.group.id).eq('page', a.page),
        ),
      ]
    }),
  ])

  // 3. Ligações novas depois dos itens (cada ponta precisa existir em group_items)
  await run(
    links
      .filter((l) => l.upsert.length)
      .map((l) =>
        db
          .from('group_links')
          .upsert(l.upsert.map((link) => ({ user_id: userId, group_id: l.group.id, from_page: link.from, to_page: link.to })), {
            ignoreDuplicates: true,
          }),
      ),
  )

  // 4. Grupos apagados por último (os itens deles somem junto)
  if (groups.removed.length) await run([db.from('groups').delete().in('id', groups.removed.map(byId))])
}
