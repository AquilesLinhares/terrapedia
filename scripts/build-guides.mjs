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

// Molde novo (`format: 2`): curto e só com o que se usa durante o jogo. Veja "Molde novo das páginas" no CLAUDE.md.
const BASE_V2 = { required: [...BASE.required, 'format', 'quick'], optional: [...BASE.optional, 'shortcuts'] }
const BOSS_V2 = { required: ['duo', 'summon', 'arena', 'phases', 'drops'], optional: ['dropsMore'], quick: 3 }
const TYPES_V2 = {
  chefe: BOSS_V2,
  evento: BOSS_V2,
  item: { required: ['duo', 'obtain'], optional: ['modifier', 'usedIn'], quick: 2 },
  crafting: { required: ['what', 'build', 'produces', 'substitutes'], optional: [], quick: 2 },
}
const SHORTCUTS = new Set(['buffs', 'arena', 'drops', 'modifier', 'tree'])
const DUO_CLASSES = ['summoner', 'mage']

// Nomes conhecidos: inglês do dicionário (e páginas) + nomes das receitas
const dict = readJson(join(ROOT, 'src/data/dictionary.json'))
const recipes = readJson(join(ROOT, 'src/data/recipes.json'))
const tools = readJson(join(ROOT, 'src/data/tools-data.json'))
const bossPrepSrc = readFileSync(join(ROOT, 'src/lib/bossPrep.ts'), 'utf8')
const stageIds = new Set([...readFileSync(join(ROOT, 'src/lib/progression.ts'), 'utf8').matchAll(/\{ id: '([a-z-]+)', label/g)].map((m) => m[1]))
const recipeResults = new Set(recipes.recipes.map((r) => recipes.names[r[0]]))
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

let conferir = 0

function checkV2(guide, file, warn) {
  const type = TYPES_V2[guide.type]
  if (!type) return warn(`tipo "${guide.type}" desconhecido no molde novo (use ${Object.keys(TYPES_V2).join(', ')})`)
  if (fileName(guide.page ?? '') !== file) warn(`o arquivo deveria se chamar ${fileName(guide.page ?? '')}`)
  const required = [...BASE_V2.required, ...type.required]
  const allowed = new Set([...required, ...BASE_V2.optional, ...type.optional])
  for (const key of required) if (!(key in guide)) warn(`falta a seção "${key}"`)
  for (const key of Object.keys(guide)) if (!allowed.has(key)) warn(`chave desconhecida "${key}"`)
  if (!Array.isArray(guide.tags) || guide.tags.length < 5) warn('poucas etiquetas (use pelo menos 5)')
  if (typeof guide.source?.revid !== 'number' || !guide.source?.date) warn('"source" precisa de revid e date')
  if (!Array.isArray(guide.quick) || guide.quick.length !== type.quick) warn(`"quick" precisa de ${type.quick} linhas`)
  for (const s of guide.shortcuts ?? []) {
    if (!SHORTCUTS.has(s)) warn(`atalho desconhecido "${s}"`)
    else if ((s === 'buffs' || s === 'arena') && !bossPrepSrc.includes(`key: '${guide.page}'`)) warn(`atalho "${s}": o chefe não existe em bossPrep.ts`)
    else if (s === 'drops' && !(guide.type === 'item' ? tools.drops[guide.page] : Object.values(tools.drops).some((l) => l.some((e) => e[0] === guide.page))))
      warn('atalho "drops": a página não aparece na tabela de drops')
    else if (s === 'modifier' && !tools.items[guide.page]) warn('atalho "modifier": item não está em tools-data.json')
    else if (s === 'tree' && !recipeResults.has(guide.page)) warn('atalho "tree": sem receita em recipes.json')
  }
  for (const f of guide.facts ?? []) if (f.modes && f.modes.length !== 3) warn(`ficha "${f.label}": "modes" precisa de 3 valores (Clássico, Expert, Mestre)`)
  for (const key of type.required) {
    const value = guide[key]
    if (value === undefined || key === 'phases' || key === 'duo') continue
    for (const k of Object.keys(value)) if (!SECTION_KEYS.has(k)) warn(`chave desconhecida "${key}.${k}"`)
  }
  if (guide.type === 'item') {
    for (const c of DUO_CLASSES) if (!guide.duo?.[c]?.text) warn(`duo.${c}.text faltando`)
  } else if (guide.duo) {
    for (const c of DUO_CLASSES) {
      const entries = guide.duo[c]
      if (!Array.isArray(entries) || !entries.length) warn(`duo.${c} precisa de pelo menos uma etapa`)
      for (const e of entries ?? []) if (!stageIds.has(e.stage)) warn(`duo.${c}: etapa desconhecida "${e.stage}"`)
    }
  }
  const names = []
  const texts = []
  const walk = (value) => {
    if (typeof value === 'string') texts.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (k === 'recipesOf') names.push(...v)
        else if (['items', 'take', 'alt'].includes(k) && Array.isArray(v)) v.forEach((it) => (typeof it === 'string' ? names.push(it) : walk(it)))
        else if (k === 'name' && typeof v === 'string' && !('text' in value)) names.push(v)
        else walk(v)
      }
    }
  }
  walk({ ...guide, tags: [], source: null, page: null })
  for (const t of texts) for (const [, name] of t.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) names.push(name)
  for (const name of new Set(names)) if (!known.has(name.toLowerCase())) warn(`nome desconhecido "${name}"`)
  const count = texts.filter((t) => /conferir/i.test(t)).length
  conferir += count
  console.log(`  ${file}: ${count} marca(s) "conferir"`)
}

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

  if (guide.format === 2) {
    checkV2(guide, file, warn)
    index.push([guide.page, guide.type, ptName(guide.page), guide.tags])
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
console.log(`${conferir} marca(s) "conferir" no molde novo.`)
console.log(`${index.length} páginas no índice. ${problems ? `${problems} aviso(s) acima.` : 'Nenhum problema.'}`)
process.exitCode = problems ? 1 : 0
