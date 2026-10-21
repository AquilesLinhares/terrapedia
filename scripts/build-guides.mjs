// Confere as páginas reorganizadas (src/data/guides/*.json) e gera o índice da busca por etiquetas.
//
// Cada página segue um formato fixo por tipo (veja src/lib/guides.ts). Este script avisa quando:
//   - falta uma seção obrigatória ou aparece uma chave desconhecida
//   - o nome do arquivo não bate com o título da página
//   - um nome em [[...]] ou numa lista de itens não existe no dicionário nem nas receitas (erro de digitação?)
//
// Uso: node scripts/build-guides.mjs
// Saída: src/data/guide-index.json — [página, tipo, nome PT, etiquetas] de cada página

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GUIDES = join(ROOT, 'src/data/guides')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// Seções de cada tipo: [obrigatórias, opcionais]. Mesma ordem em que aparecem na tela.
const BASE = { required: ['page', 'type', 'tags', 'summary', 'source'], optional: ['facts', 'tips'] }
const TYPES = {
  evento: { required: ['natural', 'summon', 'effects', 'enemies', 'drops'], optional: [] },
  chefe: { required: ['summon', 'where', 'prep', 'phases', 'drops'], optional: [] },
  item: { required: ['what', 'obtain'], optional: ['crafting', 'usedIn'] },
}
const SECTION_KEYS = new Set(['text', 'groups', 'recipesOf'])

// Nomes conhecidos: inglês do dicionário (e páginas) + nomes das receitas
const dict = readJson(join(ROOT, 'src/data/dictionary.json'))
const recipes = readJson(join(ROOT, 'src/data/recipes.json'))
const known = new Set([...dict.entries.flatMap(([, en, , page]) => [en, page ?? en]), ...recipes.names].map((n) => n.toLowerCase()))

/** Nome PT oficial de uma página (o mesmo critério de ptNameForPage no app). */
function ptName(page) {
  const key = page.toLowerCase()
  const entries = dict.entries.filter(([, en, , p]) => (p ?? en).toLowerCase() === key)
  const best = entries.find(([, en]) => en.toLowerCase() === key) ?? entries[0]
  return best && best[0].toLowerCase() !== best[1].toLowerCase() ? best[0] : ''
}

const fileName = (page) => page.replace(/ /g, '_').replace(/[\\/:*?"<>|%]/g, (c) => encodeURIComponent(c)) + '.json'

let problems = 0
const index = []

for (const file of readdirSync(GUIDES).filter((f) => f.endsWith('.json')).sort()) {
  const warn = (msg) => {
    problems++
    console.warn(`  ⚠ ${file}: ${msg}`)
  }
  let guide
  try {
    guide = readJson(join(GUIDES, file))
  } catch (err) {
    warn(`JSON inválido (${err.message})`)
    continue
  }

  const type = TYPES[guide.type]
  if (!type) {
    warn(`tipo "${guide.type}" desconhecido (use ${Object.keys(TYPES).join(', ')})`)
    continue
  }
  if (fileName(guide.page ?? '') !== file) warn(`o arquivo deveria se chamar ${fileName(guide.page ?? '')}`)

  const required = [...BASE.required, ...type.required]
  const allowed = new Set([...required, ...BASE.optional, ...type.optional])
  for (const key of required) if (!(key in guide)) warn(`falta a seção "${key}"`)
  for (const key of Object.keys(guide)) if (!allowed.has(key)) warn(`chave desconhecida "${key}"`)
  if (!Array.isArray(guide.tags) || guide.tags.length < 5) warn('poucas etiquetas (use pelo menos 5)')
  if (typeof guide.source?.revid !== 'number' || !guide.source?.date) warn('"source" precisa de revid e date')

  // Todos os textos e nomes de itens da página
  const texts = [guide.summary, ...(guide.tips ?? []), ...(guide.facts ?? []).map((f) => f.value)]
  const names = []
  for (const key of [...type.required, ...type.optional]) {
    const value = guide[key]
    if (value === undefined) continue
    if (key === 'phases') {
      for (const phase of value) texts.push(...phase.text)
      continue
    }
    for (const k of Object.keys(value)) if (!SECTION_KEYS.has(k)) warn(`chave desconhecida "${key}.${k}"`)
    texts.push(...(value.text ?? []))
    names.push(...(value.recipesOf ?? []))
    for (const group of value.groups ?? []) {
      if (group.label) texts.push(group.label)
      for (const item of group.items) {
        names.push(typeof item === 'string' ? item : item.name)
        if (typeof item !== 'string' && item.note) texts.push(item.note)
      }
    }
  }
  for (const text of texts) for (const [, name] of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) names.push(name)
  for (const name of new Set(names)) if (!known.has(name.toLowerCase())) warn(`nome desconhecido "${name}"`)

  index.push([guide.page, guide.type, ptName(guide.page), guide.tags])
}

writeFileSync(join(ROOT, 'src/data/guide-index.json'), JSON.stringify(index))
console.log(`${index.length} páginas no índice. ${problems ? `${problems} aviso(s) acima.` : 'Nenhum problema.'}`)
process.exitCode = problems ? 1 : 0
