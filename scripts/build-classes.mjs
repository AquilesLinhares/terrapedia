// Confere os guias de classe (src/data/classes/*.json) e gera os selos de Expert/Mestre.
//
// Avisa quando:
//   - falta uma chave obrigatória ou aparece uma desconhecida
//   - uma etapa não existe em progression.ts, aparece duas vezes ou fora de ordem
//   - um caminho aponta (`next`) para um id que não está na etapa seguinte
//   - uma subclasse ou um chefe/evento (`next.target`, `optional`) não existe
//   - um nome em [[...]] ou numa lista de itens não existe no dicionário nem nas receitas
//
// Depois pergunta à wiki (tabela Cargo "Items") a raridade de todos os itens citados: raridade -12 é item de
// Expert e -13 de Mestre. Grava src/data/exclusive-items.json ({ "Shield of Cthulhu": "expert", ... }).
//
// Uso: node scripts/build-classes.mjs  (precisa de internet para a parte dos selos)

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLASSES = join(ROOT, 'src/data/classes')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// Etapas e marcos direto de progression.ts (para não repetir a lista aqui)
const progression = readFileSync(join(ROOT, 'src/lib/progression.ts'), 'utf8')
const STAGE_IDS = [...progression.matchAll(/\bid: '([a-z-]+)'/g)].map((m) => m[1])
const MILESTONE_KEYS = new Set([...progression.matchAll(/\{ key: '((?:[^'\\]|\\.)*)'|\{ key: "([^"]*)"/g)].map((m) => (m[1] ?? m[2]).replace(/\\'/g, "'")))

const dict = readJson(join(ROOT, 'src/data/dictionary.json'))
const recipes = readJson(join(ROOT, 'src/data/recipes.json'))
const known = new Set([...dict.entries.flatMap(([, en, , page]) => [en, page ?? en]), ...recipes.names].map((n) => n.toLowerCase()))
const translated = new Set(dict.entries.filter(([pt, en]) => pt.toLowerCase() !== en.toLowerCase()).map(([, en]) => en.toLowerCase()))

const KEYS = {
  guide: { required: ['class', 'slug', 'title', 'emblem', 'intro', 'basics', 'subclasses', 'stages', 'source'], optional: ['names'] },
  stage: { required: ['stage', 'summary', 'armor', 'weapons', 'accessories', 'buffs', 'paths', 'next'], optional: ['armorAlt'] },
  path: { required: ['id', 'title', 'when', 'sub', 'armor', 'weapons', 'pros', 'cons'], optional: ['extras', 'next'] },
  item: { required: ['name'], optional: ['note', 'qty', 'image', 'sub'] },
  weapon: { required: ['sub'], optional: ['item', 'alt', 'note'] },
  next: { required: ['prep'], optional: ['target', 'optional', 'arena'] },
}

let problems = 0
const allNames = new Set()

for (const file of readdirSync(CLASSES).filter((f) => f.endsWith('.json')).sort()) {
  const warn = (msg) => {
    problems++
    console.warn(`  ⚠ ${file}: ${msg}`)
  }
  const checkKeys = (obj, kind, where) => {
    const { required, optional } = KEYS[kind]
    for (const k of required) if (!(k in obj)) warn(`${where}: falta "${k}"`)
    for (const k of Object.keys(obj)) if (!required.includes(k) && !optional.includes(k)) warn(`${where}: chave desconhecida "${k}"`)
  }

  let guide
  try {
    guide = readJson(join(CLASSES, file))
  } catch (err) {
    warn(`JSON inválido (${err.message})`)
    continue
  }
  checkKeys(guide, 'guide', 'guia')
  if (`${guide.class}.json` !== file) warn(`o arquivo deveria se chamar ${guide.class}.json`)
  if (typeof guide.source?.revid !== 'number' || !guide.source?.date || !guide.source?.page) warn('"source" precisa de page, revid e date')

  // Nomes PT de reserva: só para o que o dicionário ainda não traduz
  for (const en of Object.keys(guide.names ?? {})) {
    if (!known.has(en.toLowerCase())) warn(`names: "${en}" não existe no dicionário nem nas receitas`)
    else if (translated.has(en.toLowerCase())) warn(`names: o dicionário já traduz "${en}"; tire daqui`)
  }

  const subs = new Set((guide.subclasses ?? []).map((s) => s.id))
  const texts = [guide.intro, ...(guide.basics ?? []), ...(guide.subclasses ?? []).map((s) => s.text)]
  const names = [guide.emblem, ...(guide.subclasses ?? []).map((s) => s.icon)]

  const checkSubs = (list, where) => {
    for (const s of list ?? []) if (!subs.has(s)) warn(`${where}: subclasse "${s}" não existe`)
  }
  const item = (it, where) => {
    if (typeof it === 'string') return names.push(it)
    checkKeys(it, 'item', where)
    names.push(it.name)
    if (it.note) texts.push(it.note)
    checkSubs(it.sub, where)
  }

  let lastIndex = -1
  const stages = guide.stages ?? []
  stages.forEach((st, i) => {
    const where = `etapa ${st.stage}`
    checkKeys(st, 'stage', where)
    const index = STAGE_IDS.indexOf(st.stage)
    if (index === -1) warn(`${where}: não existe em progression.ts (${STAGE_IDS.join(', ')})`)
    else if (index <= lastIndex) warn(`${where}: repetida ou fora de ordem`)
    lastIndex = Math.max(lastIndex, index)

    texts.push(st.summary)
    item(st.armor, `${where}.armor`)
    for (const it of st.armorAlt ?? []) item(it, `${where}.armorAlt`)
    for (const w of st.weapons ?? []) {
      checkKeys(w, 'weapon', `${where}.weapons`)
      checkSubs([w.sub], `${where}.weapons`)
      if (w.item) item(w.item, `${where}.weapons`)
      for (const it of w.alt ?? []) item(it, `${where}.weapons.alt`)
      if (w.note) texts.push(w.note)
      if (!w.item && !w.note) warn(`${where}.weapons: "${w.sub}" sem item precisa de "note" explicando`)
    }
    for (const it of st.accessories ?? []) item(it, `${where}.accessories`)
    for (const it of st.buffs ?? []) item(it, `${where}.buffs`)

    const nextIds = new Set((stages[i + 1]?.paths ?? []).map((p) => p.id))
    for (const p of st.paths ?? []) {
      const pw = `${where}, caminho ${p.id}`
      checkKeys(p, 'path', pw)
      checkSubs(p.sub, pw)
      texts.push(p.when, ...(p.pros ?? []), ...(p.cons ?? []))
      for (const it of [...(p.armor ?? []), ...(p.weapons ?? []), ...(p.extras ?? [])]) item(it, pw)
      for (const id of p.next ?? []) if (!nextIds.has(id)) warn(`${pw}: "next" aponta para "${id}", que não está na etapa seguinte`)
    }
    const ids = (st.paths ?? []).map((p) => p.id)
    if (new Set(ids).size !== ids.length) warn(`${where}: ids de caminho repetidos`)

    if (st.next) {
      checkKeys(st.next, 'next', `${where}.next`)
      if (st.next.target && !MILESTONE_KEYS.has(st.next.target)) warn(`${where}.next: "${st.next.target}" não está em MILESTONES`)
      for (const o of st.next.optional ?? []) {
        if (!MILESTONE_KEYS.has(o.key)) warn(`${where}.next.optional: "${o.key}" não está em MILESTONES`)
        texts.push(o.why)
      }
      texts.push(...(st.next.prep ?? []), ...(st.next.arena ?? []))
    }
  })

  for (const text of texts) for (const [, name] of String(text).matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) names.push(name)
  for (const name of new Set(names)) {
    if (!known.has(name.toLowerCase())) warn(`nome desconhecido "${name}"`)
    allNames.add(name)
  }
  console.log(`${file}: ${stages.length} etapas, ${new Set(names).size} nomes`)
}

// ---------- Selos de Expert / Mestre ----------

const RARITY = { '-12': 'expert', '-13': 'master' }
const exclusive = {}
const list = [...allNames].sort()
try {
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40)
    const where = `Items.name IN (${chunk.map((n) => `"${n.replace(/"/g, '\\"')}"`).join(',')})`
    const url = 'https://terraria.wiki.gg/api.php?' + new URLSearchParams({ action: 'cargoquery', tables: 'Items', fields: 'name,rare', where, limit: '500', format: 'json' })
    const res = await fetch(url, { headers: { 'User-Agent': 'Terrapedia/1.0 (guias de classe; sem fins comerciais)' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    // Um nome pode ter várias linhas (ex.: a pintura "Constellation"): basta uma ser exclusiva
    for (const { title } of json.cargoquery ?? []) {
      const mode = RARITY[String(title.rare).trim()]
      if (mode) exclusive[title.name] = mode
    }
    await new Promise((r) => setTimeout(r, 800))
  }
  writeFileSync(join(ROOT, 'src/data/exclusive-items.json'), JSON.stringify(exclusive, Object.keys(exclusive).sort(), 1) + '\n')
  console.log(`Selos: ${Object.entries(exclusive).map(([n, m]) => `${n} (${m})`).join(', ') || 'nenhum'}`)
} catch (err) {
  problems++
  console.warn(`  ⚠ não deu para buscar as raridades na wiki (${err.message}); exclusive-items.json não foi mudado`)
}

console.log(problems ? `${problems} aviso(s) acima.` : 'Nenhum problema.')
process.exitCode = problems ? 1 : 0
