// Baixa todas as receitas de crafting da wiki e salva em src/data/recipes.json.
//
// Fontes (todas da terraria.wiki.gg):
//   1. Tabela Cargo "Recipes": resultado, quantidade, bancada e ingredientes de cada receita
//   2. Tabela Cargo "Items": id e sprite de cada item
//   3. Página "Alternative crafting ingredients": quem faz parte de cada grupo "Any ..."
//      (ex.: "Any Iron Bar" = Iron Bar ou Lead Bar)
//
// Só ficam as receitas da versão atual do jogo no PC/console/celular: as de versões antigas
// (old-gen, 3DS) e as das páginas "Legacy:" são descartadas.
//
// Uso: node scripts/build-recipes.mjs
// Saída: src/data/recipes.json

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://terraria.wiki.gg/api.php'
const HEADERS = { 'User-Agent': 'TerrapediaRecipesBuilder/0.1 (https://github.com/AquilesLinhares/terrapedia)' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A Cargo devolve alguns textos com códigos HTML ("Light&#039;s Bane.png")
const decode = (s) =>
  s.replace(/&#0*39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

// Uma requisição por vez, com pausa entre elas, pra não sobrecarregar a wiki.
// Se ela responder 429 ("muitas requisições"), espera o tempo que ela pedir e tenta de novo.
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`
  for (let attempt = 1; ; attempt++) {
    await sleep(1000)
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after')) || 10 * attempt
        throw Object.assign(new Error(`HTTP ${res.status}`), { wait })
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error?.code === 'maxlag') throw Object.assign(new Error('maxlag'), { wait: 5 })
      if (data.error) throw new Error(data.error.info ?? data.error.code)
      return data
    } catch (err) {
      if (attempt >= 8) throw err
      const wait = err.wait ?? 2 * attempt
      process.stdout.write(`\n  (${err.message}: esperando ${wait}s)\n`)
      await sleep(wait * 1000)
    }
  }
}

/** Lê uma tabela Cargo inteira, 500 linhas por vez. */
async function cargoAll(table, fields, label) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const data = await api({
      action: 'cargoquery',
      tables: table,
      fields,
      order_by: `${table}._ID`,
      limit: '500',
      offset: String(offset),
    })
    const page = (data.cargoquery ?? []).map((r) => r.title)
    rows.push(...page)
    process.stdout.write(`\r${label}: ${rows.length}`)
    if (page.length < 500) break
  }
  process.stdout.write('\n')
  return rows
}

// ---------- 1. Receitas ----------

const rawRecipes = await cargoAll(
  'Recipes',
  '_pageName=page,result,amount,version,station,args',
  'Receitas baixadas',
)

// "args" vem como "Iron Bar¦10^Any Wood¦3". Ingredientes com "#i:old" usam o sprite antigo:
// são linhas de histórico, não receitas atuais.
const isCurrent = (r) =>
  !r.page.startsWith('Legacy:') && (r.version === '' || r.version.includes('desktop')) && !r.args.includes('#')

const recipes = []
const seen = new Set()
for (const r of rawRecipes.filter(isCurrent)) {
  const ingredients = r.args.split('^').map((part) => {
    const [name, amount] = part.split('¦')
    return [decode(name).trim(), Number(amount) || 1]
  })
  const key = [r.result, r.amount, r.station, r.args].join('|')
  if (seen.has(key)) continue
  seen.add(key)
  recipes.push({ result: decode(r.result).trim(), amount: Number(r.amount) || 1, station: decode(r.station).trim(), ingredients })
}
console.log(`Receitas atuais: ${recipes.length} (de ${rawRecipes.length} linhas)`)

// ---------- 2. Itens (id e sprite) ----------

const items = await cargoAll('Items', 'itemid,name,image', 'Itens baixados')
const nameById = new Map()
const fileByName = new Map()
for (const item of items) {
  const name = decode(item.name ?? '').trim()
  if (!name) continue
  if (item.itemid && !nameById.has(item.itemid)) nameById.set(item.itemid, name)
  // A ficha pode ter várias imagens; a primeira é o sprite do item
  const file = item.image?.match(/\[\[File:([^|\]]+)/)?.[1]
  if (file && !fileByName.has(name)) fileByName.set(name, decode(file).trim())
}

// ---------- 3. Grupos "Any ..." ----------

const groupPage = await api({ action: 'parse', page: 'Alternative crafting ingredients', prop: 'wikitext' })
const groupMembers = new Map() // "Any Iron Bar" → ["Iron Bar", "Lead Bar"]
for (const [, group, ids] of groupPage.parse.wikitext.matchAll(/\{\{#arraydefine:ids-([^|]+)\|([^|}]+)/g)) {
  const members = ids.split(',').map((id) => nameById.get(id.trim())).filter(Boolean)
  if (members.length) groupMembers.set(`Any ${group.trim()}`, members)
}
console.log(`Grupos: ${groupMembers.size}`)

const usedGroups = new Set(recipes.flatMap((r) => r.ingredients.map(([n]) => n)).filter((n) => n.startsWith('Any ')))
for (const g of usedGroups) if (!groupMembers.has(g)) console.warn(`  Atenção: grupo "${g}" sem lista de itens`)

// ---------- Montagem ----------

// Formato compacto: cada nome aparece uma vez em `names` e o resto usa o índice dele.
const names = []
const indexOf = new Map()
function idx(name) {
  if (!indexOf.has(name)) {
    indexOf.set(name, names.length)
    names.push(name)
  }
  return indexOf.get(name)
}

const stations = []
const stationIndex = new Map()
function stationIdx(station) {
  if (!stationIndex.has(station)) {
    stationIndex.set(station, stations.length)
    stations.push(station)
  }
  return stationIndex.get(station)
}

// Receita: [resultado, quantidade, bancada, ingrediente1, qtd1, ingrediente2, qtd2, ...]
const recipeRows = recipes.map((r) => [
  idx(r.result),
  r.amount,
  stationIdx(r.station),
  ...r.ingredients.flatMap(([name, amount]) => [idx(name), amount]),
])

const groups = [...groupMembers]
  .filter(([g]) => usedGroups.has(g))
  .map(([g, members]) => [idx(g), members.map(idx)])

// As bancadas também ganham sprite ("Iron Anvil and Ecto Mist" → "Iron Anvil", "Ecto Mist")
for (const s of stations) for (const part of s.split(' and ')) idx(part.trim())

// Sprite de cada nome: 0 = arquivo "<nome>.png" (o mais comum), texto = outro arquivo, null = sem sprite.
// Quando a tabela de itens não diz (ex.: "Work Bench"), apostamos em "<nome>.png": quase sempre existe,
// e o app esconde a imagem se não carregar. Grupos "Any ..." usam o sprite do primeiro item do grupo.
const sprites = names.map((name) => {
  if (groupMembers.has(name) || name.startsWith('Any ') || name === 'By Hand') return null
  const file = fileByName.get(name)
  return !file || file === `${name}.png` ? 0 : file
})

mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })
const outFile = join(ROOT, 'src', 'data', 'recipes.json')
writeFileSync(
  outFile,
  JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source: 'Tabelas Cargo "Recipes" e "Items" da terraria.wiki.gg (CC BY-NC-SA 3.0)',
    names,
    sprites,
    stations,
    groups,
    recipes: recipeRows,
  }),
)
console.log(`Pronto: ${recipeRows.length} receitas, ${names.length} nomes em ${outFile}`)
