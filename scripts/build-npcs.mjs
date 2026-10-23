// Baixa da wiki os dados dos NPCs usados pelas Ferramentas (Felicidade dos NPCs e Vendedores) e salva em
// src/data/npc-data.json.
//
// Fontes (terraria.wiki.gg):
//   1. "NPCs/preferences": biomas e vizinhos que cada NPC ama / gosta / não gosta / odeia
//   2. Página de cada NPC vendedor: a loja ({{shop row|Item|condição}})
//   3. Tabela Cargo "Items": preço de compra de cada item da loja
//
// As condições de venda vêm em inglês; o português fica em scripts/npc-conditions-pt.json (escrito por nós).
// Condição sem tradução aparece no aviso do fim — escreva a linha nesse arquivo e rode de novo.
// Itens que só existem em mundos especiais (Remix, Zenith, Not the Bees...) ficam de fora.
//
// Uso: node scripts/build-npcs.mjs
// Saída: src/data/npc-data.json

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://terraria.wiki.gg/api.php'
const HEADERS = { 'User-Agent': 'TerrapediaNpcBuilder/0.1 (https://github.com/AquilesLinhares/terrapedia)' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const decode = (s) =>
  String(s ?? '')
    .replace(/&#0*39;/g, "'")
    .replace(/&#32;/g, ' ')
    .replace(/&#8204;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

// Uma requisição por vez, com pausa; 429/5xx espera e tenta de novo (igual ao build-tools.mjs)
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

async function wikitext(page) {
  const data = await api({ action: 'parse', page, prop: 'wikitext|revid', redirects: '1' })
  return { text: data.parse.wikitext, revid: data.parse.revid }
}

/** Divide os parâmetros de um modelo da wiki pelo "|" de fora (ignora os de {{...}} e [[...]] internos). */
function splitParams(body) {
  const parts = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2)
    if (two === '{{' || two === '[[') {
      depth++
      cur += two
      i++
    } else if (two === '}}' || two === ']]') {
      depth--
      cur += two
      i++
    } else if (body[i] === '|' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += body[i]
  }
  parts.push(cur)
  return parts
}

// Chefes e eventos do app (keys de MILESTONES em progression.ts)
const MILESTONE_KEYS = [...readFileSync(join(ROOT, 'src/lib/progression.ts'), 'utf8').matchAll(/\{ key: (['"])(.+?)\1/g)].map((m) => m[2])

// ---------- 1. Preferências ----------

const BIOMES = {
  Forest: 'forest',
  Desert: 'desert',
  Ocean: 'ocean',
  'Snow biome': 'snow',
  Jungle: 'jungle',
  'The Hallow': 'hallow',
  Underground: 'underground',
  Cavern: 'underground',
  'The Underworld': 'underground',
  'Glowing Mushroom biome': 'mushroom',
}

const prefsPage = await wikitext('NPCs/preferences')
const table = prefsPage.text.slice(prefsPage.text.indexOf('{|'), prefsPage.text.lastIndexOf('|}'))
// Tabela com rowspan: monta a grade (linha × coluna) e junta as linhas de cada NPC
const grid = []
const pending = [] // coluna → { cell, left }
for (const rowText of table.split(/\n\|-[^\n]*/).slice(1)) {
  const cells = rowText
    .split('\n')
    .filter((l) => l.startsWith('|') && !l.startsWith('|}'))
    .map((l) => {
      const m = l.match(/^\|\s*rowspan="(\d+)"\s*\|(.*)$/)
      return m ? { text: m[2], span: Number(m[1]) } : { text: l.slice(1), span: 1 }
    })
  if (!cells.length) continue
  const row = []
  let col = 0
  for (const cell of cells) {
    while (pending[col]?.left > 0) {
      row[col] = pending[col].cell
      pending[col].left--
      col++
    }
    row[col] = cell
    if (cell.span > 1) pending[col] = { cell, left: cell.span - 1 }
    col++
  }
  while (pending[col]?.left > 0) {
    row[col] = pending[col].cell
    pending[col].left--
    col++
  }
  grid.push(row)
}

/** Itens de uma célula: `{{item|Nome}}` (com coração = ama / com caveira = odeia). */
const cellEntries = (cell) =>
  [...(cell?.text ?? '').matchAll(/\{\{item\|([^|}]+)[^}]*\}\}\s*(\{\{#var:(love|hate)_icon\}\})?/g)].map((m) => ({
    name: m[1].trim(),
    strong: Boolean(m[3]),
  }))

const prefs = {}
const seen = new Map() // NPC → células já lidas (a mesma célula com rowspan aparece em várias linhas)
for (const row of grid) {
  const npc = cellEntries(row[0])[0]?.name
  if (!npc) continue
  const p = (prefs[npc] ??= { biome: {}, npc: {} })
  const done = seen.get(npc) ?? new Set()
  seen.set(npc, done)
  const read = (col, kind, good) => {
    const cell = row[col]
    if (!cell || done.has(cell)) return
    done.add(cell)
    for (const { name, strong } of cellEntries(cell)) {
      const level = good ? (strong ? 'love' : 'like') : strong ? 'hate' : 'dislike'
      if (kind === 'biome') {
        const id = BIOMES[name]
        if (!id) console.warn(`  Atenção: bioma desconhecido "${name}" (${npc})`)
        else p.biome[id] = level
      } else p.npc[name] = level
    }
  }
  read(1, 'biome', true)
  read(2, 'biome', false)
  read(3, 'npc', true)
  read(4, 'npc', false)
}
// A Princesa: "ama todos" e todos gostam dela (a wiki não repete isso em cada linha)
for (const [name, p] of Object.entries(prefs)) {
  if (name === 'Princess') continue
  p.npc.Princess ??= 'like'
  prefs.Princess.npc[name] = 'love'
}
console.log(`Preferências: ${Object.keys(prefs).length} NPCs`)
if (Object.keys(prefs).length < 25) console.warn('  Atenção: poucos NPCs na tabela de preferências')

// ---------- 2. Lojas ----------

const VENDORS = [
  'Merchant',
  'Arms Dealer',
  'Demolitionist',
  'Dryad',
  'Clothier',
  'Painter',
  'Dye Trader',
  'Mechanic',
  'Goblin Tinkerer',
  'Wizard',
  'Witch Doctor',
  'Steampunker',
  'Cyborg',
  'Pirate',
  'Truffle',
  'Party Girl',
  'Tavernkeep',
  'Golfer',
  'Zoologist',
  'Santa Claus',
  'Princess',
  'Stylist',
  'Skeleton Merchant',
  'Traveling Merchant',
]

// Linhas que falam de sementes especiais. Uma linha que só explica a exceção ("Not available in worlds
// with Remix...") é tirada; se sobrar uma condição de semente, o item todo fica de fora.
const SEED_NOTE = /Not available in worlds with|Anywhere in worlds with|Only available in \[\[Hardmode\]\] in worlds with|When not in \[\[The Constant\]\] world/
const SEED = /Remix|Zenith|Celebration Mk 10|Not the Bees|Vampirism|World is infected|The Constant|For the Worthy/

/** Condição em inglês → texto limpo (chave do arquivo de tradução), ou null se é só de mundo especial. */
function cleanCondition(raw) {
  let text = decode(raw)
    .replace(/\{\{small\|([\s\S]*)\}\}/, '$1')
    .replace(/ in any world except \[\[Remix\]\] and \[\[Zenith \(seed\)\|Zenith\]\] worlds/, '')
  const lines = text
    .split(/<br\s*\/?>/)
    .map((l) => l.trim())
    .filter((l) => l && !SEED_NOTE.test(l))
  if (lines.some((l) => SEED.test(l))) return null
  text = lines.join(' ').replace(/\s+/g, ' ').trim()
  // Fases da lua: "During a [[full moon]] or a waning gibbous: {{moons|1|2}}" → "{lua:1,2}"
  text = text
    .replace(/\b[Dd]uring\b(?:(?!\b[Dd]uring\b|\bif\b|\bwhen\b|\.)[^{])*\{\{moons\|([\d|]*)\}\}/g, (_, n) => `{lua:${n.split('|').filter(Boolean).join(',')}}`)
    .replace(/\{\{moons\|([\d|]*)\}\}/g, (_, n) => `{lua:${n.split('|').filter(Boolean).join(',')}}`)
    .replace(/\s*\(\{\{b entries[^}]*\}\}\)/g, '')
  return text
}

// Traduções feitas por regra (as famílias mais comuns); o resto vem do arquivo
const RULES = [
  [/^\[\[Golf score\]\] over (\d+)\.?$/, (n) => `Pontuação de golfe acima de ${n}`],
  [/^When the Bestiary has been filled to at least (\d+)%\.$/, (n) => `Bestiário com pelo menos ${n}% preenchido`],
  [/^In \[\[Hardmode\]\], when the Bestiary has been filled to at least (\d+)%\.$/, (n) => `No Modo Difícil, com o Bestiário pelo menos ${n}% preenchido`],
  [/^When the player has (?:a |an )?\[\[([^\]|]+)\]\]s? in their inventory\.$/, (item) => `Com [[${item}]] no inventário`],
  [/^When the player has (?:a |an )?([A-Z][\w' ]+?) in their inventory\.$/, (item) => `Com [[${item}]] no inventário`],
  [/^Always when selling \[\[([^\]|]+?)\]\]s?\.$/, (item) => `Sempre que vende [[${item}]]`],
  [/^\{lua:([\d,]+)\}$/, (n) => `{lua:${n}}`],
]

const ptFile = join(ROOT, 'scripts/npc-conditions-pt.json')
const PT = JSON.parse(readFileSync(ptFile, 'utf8'))
const missing = new Set()

/** Requisitos que dá para conferir pelo mundo: etapa mínima e chefes/eventos que precisam ter sido derrotados. */
function requirements(en) {
  const req = {}
  if (/^In \[\[Hardmode\]\]/.test(en) || /^When .*\[\[Hardmode\]\]/.test(en)) req.stage = 'hardmode'
  if (/all three \[\[mechanical bosses\]\]/.test(en)) req.stage = 'post-all-mechs'
  else if (/any \[\[mechanical boss\]\](?:<br\/>| )*has been defeated/.test(en) && !/^Before/.test(en)) req.stage = 'post-mech'
  // "When [[Golem]] has been defeated", "When [[Plantera]] and a [[Pirate Invasion]] have been defeated"
  // ("either ... or" e "Before defeating" não contam: são alternativas ou limites)
  if (/defeated/.test(en) && !/either| or \[\[|Before defeating|before defeating/.test(en)) {
    const needs = [...en.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)]
      .map((m) => m[1])
      .filter((k) => MILESTONE_KEYS.includes(k))
      // "[[Eater of Worlds]]/[[Brain of Cthulhu]]" = um ou outro: não conta nenhum dos dois
      .filter((k) => !en.includes(`[[${k}]]/`) && !en.includes(`/[[${k}]]`))
    if (needs.length) req.needs = [...new Set(needs)]
  }
  return req
}

const conditions = [] // { pt, stage?, needs? }
const conditionIndex = new Map()
function conditionId(en) {
  if (!en) return 0
  if (conditionIndex.has(en)) return conditionIndex.get(en)
  let pt = PT[en]
  if (pt === '') return 0 // "Always available."
  if (pt === undefined) {
    for (const [re, fn] of RULES) {
      const m = en.match(re)
      if (m) {
        pt = fn(...m.slice(1))
        break
      }
    }
  }
  if (pt === undefined) {
    missing.add(en)
    pt = en
  }
  conditions.push({ pt, ...requirements(en) })
  conditionIndex.set(en, conditions.length) // 0 = sem condição
  return conditions.length
}

const shops = {}
const revids = {}
for (const npc of VENDORS) {
  process.stdout.write(`\rLojas: ${npc}                    `)
  const { text, revid } = await wikitext(npc)
  revids[npc] = revid
  const rows = []
  for (const m of text.matchAll(/\{\{shop[ _]row\|([^\n]*)\}\}/g)) {
    const parts = splitParams(m[1])
    const named = Object.fromEntries(parts.filter((p) => /^\s*\w+\s*=/.test(p)).map((p) => [p.split('=')[0].trim(), p.slice(p.indexOf('=') + 1).trim()]))
    const [item, ...rest] = parts.filter((p) => !/^\s*\w+\s*=/.test(p)).map((p) => p.trim())
    const en = cleanCondition(rest.join(' '))
    if (en === null) continue
    rows.push({ item: decode(item).trim(), value: named.value, en })
  }
  if (!rows.length) console.warn(`\n  Atenção: loja vazia em "${npc}"`)
  shops[npc] = rows
}
process.stdout.write('\n')

// ---------- 3. Preços ----------

const names = [...new Set(Object.values(shops).flatMap((rows) => rows.map((r) => r.item)))]
const priceByName = {}
const priceById = {}
/** Preço em cobre (ou medalhas do Defensor) a partir do HTML de moedas da wiki. */
function parseCoins(html) {
  const s = decode(html)
  const dm = s.match(/class="dm">(\d+)/)
  if (dm) return { medals: Number(dm[1]) }
  const v = s.match(/data-sort-value="([\d.]+)"/)
  return v ? { copper: Number(v[1]) } : null
}
async function loadPrices(where, label) {
  const rows = await api({ action: 'cargoquery', tables: 'Items', fields: 'Items.name=name,Items.itemid=itemid,Items.buy=buy', where, limit: '500' })
  for (const { title: r } of rows.cargoquery ?? []) {
    const price = parseCoins(r.buy)
    const name = decode(r.name).trim()
    if (price && !priceByName[name]) priceByName[name] = price
    if (price && r.itemid) priceById[r.itemid] ??= price
  }
  process.stdout.write(`\r${label}`)
}
for (let i = 0; i < names.length; i += 60) {
  const batch = names.slice(i, i + 60).map((n) => `'${n.replace(/'/g, "\\'")}'`)
  await loadPrices(`Items.name IN (${batch.join(',')})`, `Preços: ${Math.min(i + 60, names.length)}/${names.length}`)
}
// {{iteminfo|4876|buy}} / {{iteminfo|Nome|buy}} usados em value=
const infoRefs = [...new Set(Object.values(shops).flatMap((rows) => rows.map((r) => r.value?.match(/\{\{iteminfo\|([^|}]+)/)?.[1]).filter(Boolean)))]
const ids = infoRefs.filter((r) => /^\d+$/.test(r))
const infoNames = infoRefs.filter((r) => !/^\d+$/.test(r) && !priceByName[r])
if (ids.length) await loadPrices(`Items.itemid IN (${ids.join(',')})`, 'Preços (iteminfo)')
if (infoNames.length) await loadPrices(`Items.name IN (${infoNames.map((n) => `'${n.replace(/'/g, "\\'")}'`).join(',')})`, 'Preços (iteminfo)')
process.stdout.write('\n')

const COIN = { pc: 1_000_000, gc: 10_000, sc: 100, cc: 1 }
function priceOf(row) {
  if (row.value) {
    const coin = row.value.match(/^\{\{(pc|gc|sc|cc)\|([\d.]+)\}\}$/)
    if (coin) return { copper: Number(coin[2]) * COIN[coin[1]] }
    const ref = row.value.match(/\{\{iteminfo\|([^|}]+)/)?.[1]
    if (ref) return (/^\d+$/.test(ref) ? priceById[ref] : priceByName[ref]) ?? null
  }
  return priceByName[row.item] ?? null
}

// Formato compacto: [item, preço, condição] — preço em cobre (número), em medalhas ("5m") ou 0;
// condição = índice em `conditions` (+1; 0 = sempre)
const out = { source: { date: new Date().toISOString().slice(0, 10), prefsRevid: prefsPage.revid, shops: revids }, prefs, conditions, shops: {} }
let noPrice = 0
for (const [npc, rows] of Object.entries(shops)) {
  out.shops[npc] = rows.map((row) => {
    const price = priceOf(row)
    if (!price) noPrice++
    const row3 = [row.item, price?.medals ? `${price.medals}m` : price?.copper ?? 0, conditionId(row.en)]
    while (row3.length > 1 && row3[row3.length - 1] === 0) row3.pop()
    return row3
  })
}
console.log(`Lojas: ${Object.values(out.shops).flat().length} itens, ${conditions.length} condições, ${noPrice} sem preço`)
if (missing.size) {
  console.warn(`\nCondições sem tradução em scripts/npc-conditions-pt.json (${missing.size}):`)
  for (const m of missing) console.warn(`  ${JSON.stringify(m)}: "",`)
}

const OUT_PATH = join(ROOT, 'src/data/npc-data.json')
writeFileSync(OUT_PATH, JSON.stringify(out))
console.log(`Gravado ${OUT_PATH} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`)
