// Baixa da wiki os dados das Ferramentas (/ferramentas) e salva em src/data/tools-data.json.
//
// Fontes (todas da terraria.wiki.gg, tabelas Cargo — veja Special:CargoTables):
//   1. "Items": números de armas, acessórios, armaduras e ferramentas (dano, tempo de uso, repulsão, crítico,
//      velocidade do projétil, mana, raridade, defesa), categoria (listcat), buffs/debuffs, vendedor (tag)
//   2. "Equipinfo": bônus de acessórios e peças de armadura (dano por classe, lacaios, sentinelas, velocidade...)
//   3. "Modifiers": números de cada modificador de arma
//   4. "Drops": quem deixa cair cada item e a chance
//   5. Páginas "Modifiers" (quais modificadores cada tipo de arma pode ter, e os de acessório),
//      "Minion-summoning weapons" e "Sentry-summoning weapons" (total de vagas de cada conjunto de armadura,
//      já com o bônus de conjunto)
//
// Só números e nomes: nenhuma descrição do jogo vai para o arquivo.
//
// Nomes PT dos modificadores ("Legendary" → "Lendário"): vêm dos arquivos de tradução do jogo, os mesmos
// do dicionário (veja extract-terraria-loc.ps1). Passe a pasta como argumento; sem ela, o script mantém os
// nomes que já estão no tools-data.json.
//
// Uso: node scripts/build-tools.mjs [C:	emp	erraria-loc]
// Saída: src/data/tools-data.json

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://terraria.wiki.gg/api.php'
const HEADERS = { 'User-Agent': 'TerrapediaToolsBuilder/0.1 (https://github.com/AquilesLinhares/terrapedia)' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const decode = (s) =>
  String(s ?? '')
    .replace(/&#0*39;/g, "'")
    .replace(/&#32;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

// Uma requisição por vez, com pausa; 429/5xx espera e tenta de novo (igual ao build-recipes.mjs)
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

async function cargoAll(params, label) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const data = await api({ action: 'cargoquery', limit: '500', offset: String(offset), ...params })
    const page = (data.cargoquery ?? []).map((r) => r.title)
    rows.push(...page)
    process.stdout.write(`\r${label}: ${rows.length}`)
    if (page.length < 500) break
  }
  process.stdout.write('\n')
  return rows
}

async function wikitext(page) {
  const data = await api({ action: 'parse', page, prop: 'wikitext|revid', redirects: '1' })
  return { text: data.parse.wikitext, revid: data.parse.revid }
}

/** Primeiro número de um campo da wiki ("25", "+0.1", "{{eversions|...}} 30"); null se não houver. */
function num(raw) {
  const m = decode(raw)
    .replace(/<[^>]+>/g, ' ')
    .match(/[-+]?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

// ---------- 1. Itens ----------

const WANTED_TYPES = ['weapon', 'accessory', 'armor', 'tool']
const itemRows = await cargoAll(
  {
    tables: 'Items',
    fields:
      'Items._pageName=page,Items.itemid=itemid,Items.name=name,Items.type=type,Items.listcat=listcat,Items.damage=damage,Items.damagetype=damagetype,' +
      'Items.usetime=usetime,Items.knockback=knockback,Items.critical=critical,Items.velocity=velocity,Items.mana=mana,Items.rare=rare,' +
      'Items.defense=defense,Items.autoswing=autoswing,Items.hardmode=hardmode,Items.tag=tag,Items.buffs=buffs,Items.debuffs=debuffs,' +
      'Items.bodyslot=bodyslot,Items.unobtainable=unobtainable,Items.consumable=consumable',
    where: WANTED_TYPES.map((t) => `Items.type HOLDS '${t}'`).join(' OR '),
    order_by: 'Items._ID',
  },
  'Itens baixados',
)

// Categoria principal de uma arma/ferramenta (a primeira desta lista que aparece em listcat)
const CATEGORIES = [
  'whips',
  'broadswords',
  'shortswords',
  'spears',
  'yoyos',
  'flails',
  'boomerangs',
  'bows',
  'repeaters',
  'guns',
  'launchers',
  'magic guns',
  'wands',
  'spell books',
  'instruments',
  'minion summon items',
  'sentry summon items',
  'pickaxes',
  'drills',
  'axes',
  'chainsaws',
  'hammers',
  'hamaxes',
  'projectile melee',
  'explosives',
]
const CLASS = { Melee: 'melee', Ranged: 'ranged', Magic: 'magic', Summon: 'summon' }
const SLOT = { helmet: 'head', shirt: 'body', pants: 'legs' }

const items = {}
const vendors = {}
const nameById = new Map()
for (const r of itemRows) {
  const name = decode(r.name).trim()
  if (!name || r.unobtainable === '1') continue
  const types = decode(r.type).toLowerCase().split('^')
  if (types.includes('set') || types.includes('vanity')) continue
  if (r.itemid && !nameById.has(r.itemid)) nameById.set(r.itemid, name)
  if (items[name]) continue
  const listcat = decode(r.listcat).toLowerCase().split('^')
  const kind = types.includes('weapon')
    ? 'weapon'
    : types.includes('accessory')
      ? 'accessory'
      : types.includes('armor')
        ? 'armor'
        : 'tool'
  const tags = decode(r.tag).split('^')
  const vendorList = tags.filter((t) => t.startsWith('vendor:')).map((t) => t.slice(7))
  if (vendorList.length) vendors[name] = vendorList
  items[name] = {
    kind,
    class: CLASS[r.damagetype] ?? null,
    cat: CATEGORIES.find((c) => listcat.includes(c)) ?? null,
    slot: SLOT[r.bodyslot] ?? null,
    set: kind === 'armor' && r.page !== name ? decode(r.page) : null,
    damage: num(r.damage),
    useTime: num(r.usetime),
    knockback: num(r.knockback),
    crit: num(r.critical),
    velocity: num(r.velocity),
    mana: num(r.mana),
    rare: num(r.rare),
    defense: num(r.defense),
    autoswing: r.autoswing === '1',
    hardmode: r.hardmode === '1',
    // Armas que se gastam (Shuriken, granadas) não recebem modificador
    consumable: r.consumable === '1',
    buffs: decode(r.buffs).split('^').filter(Boolean),
    debuffs: decode(r.debuffs).split('^').filter(Boolean),
  }
}
console.log(`Itens: ${Object.keys(items).length}`)

// ---------- 2. Bônus de equipamento ----------

// Campos da Equipinfo que viram "efeitos" no comparador e na calculadora (o app traduz os nomes)
const EQUIP_FIELDS = [
  'meleeDamage',
  'rangedDamage',
  'magicDamage',
  'minionDamage',
  'meleeCrit',
  'rangedCrit',
  'magicCrit',
  'meleeSpeed',
  'moveSpeed',
  'maxMinions',
  'maxTurrets',
  'manaCost',
  'statManaMax2',
  'manaRegenBonus',
  'lifeRegen',
  'endurance',
  'armorPenetration',
  'whipRangeMultiplier',
  'arrowDamage',
  'bulletDamage',
  'rocketDamage',
  'pickSpeed',
  'jumpSpeedBoost',
  'minionKB',
  'maxTagEffects',
  'noFallDmg',
  'fireWalk',
  'noKnockback',
  'waterWalk',
  'lavaRose',
  'iceSkate',
  'magicQuiver',
  'magmaStone',
  'manaFlower',
  'manaMagnet',
  'longInvince',
  'panic',
  'sporeSac',
  'yoyoGlove',
  'yoyoString',
  'kbGlove',
  'autoReuseGlove',
  'meleeScaleGlove',
  'ammoCost80',
  'ammoCost75',
  'scope',
  'nightVision',
  'slowFall',
  'carpet',
  'dashType',
  'rocketBoots',
  'lavaMax',
  'buffImmune',
  'dd2Accessory',
  'accRunSpeed',
]
const equipRows = await cargoAll(
  { tables: 'Equipinfo', fields: ['itemid', ...EQUIP_FIELDS].join(','), order_by: 'Equipinfo._ID' },
  'Bônus de equipamento',
)
const equip = {}
for (const r of equipRows) {
  const name = nameById.get(r.itemid)
  if (!name || !items[name]) continue
  const stats = {}
  for (const f of EQUIP_FIELDS) {
    const v = decode(r[f]).trim()
    if (!v || v === '0') continue
    if (f === 'buffImmune') stats[f] = v.split('¤').length
    else if (v === '1' && !/Damage|Crit|Speed|max|Max|Regen|Cost|endurance|Penetration|Multiplier/.test(f)) stats[f] = true
    else stats[f] = Number.isFinite(Number(v)) ? Number(v) : v
  }
  if (Object.keys(stats).length) equip[name] = stats
}
console.log(`Itens com bônus: ${Object.keys(equip).length}`)

// ---------- 3. Vagas de lacaio/sentinela por conjunto (já com o bônus de conjunto) ----------

async function slotTable(page) {
  const { text, revid } = await wikitext(page)
  const armor = text.match(/\|\+ Armor[\s\S]*?\|\}/)?.[0] ?? ''
  const totals = {}
  for (const [, item, extra, slots] of armor.matchAll(/\{\{item\|([^|}]+)((?:\|[^}]*)?)\}\}\s*\|\|\s*\+(\d+)/g)) {
    if (/Celebration/.test(extra)) continue // só em mundos especiais
    const head = extra.match(/image=[^|}]* (\w+)\.png/)?.[1] // "Hallowed armor Hood.png" → "Hood"
    totals[decode(item).trim()] = { slots: Number(slots), head }
  }
  return { totals, revid }
}
const minionTable = await slotTable('Minion-summoning weapons')
const sentryTable = await slotTable('Sentry-summoning weapons')

const sets = {}
for (const [kind, table] of [
  ['minions', minionTable],
  ['sentries', sentryTable],
]) {
  for (const [page, { slots, head }] of Object.entries(table.totals)) {
    const set = (sets[page] ??= { minions: 0, sentries: 0, head: null })
    set[kind] = slots
    if (head) set.head = head
  }
}
for (const [page, set] of Object.entries(sets)) {
  const pieces = Object.entries(items).filter(([, it]) => it.set === page)
  // Peça única (Flinx Fur Coat): a "página do conjunto" é o próprio item
  if (items[page]) {
    set.pieces = [page]
  } else {
    // Cabeça: a que dá vagas (Hallowed Hood, Chlorophyte Visor); se o conjunto tiver só uma cabeça, ela
    const heads = pieces.filter(([, it]) => it.slot === 'head').map(([n]) => n)
    const head =
      heads.find((n) => set.head && n.endsWith(` ${set.head}`)) ??
      heads.find((n) => equip[n]?.maxMinions || equip[n]?.maxTurrets) ??
      heads[0]
    set.pieces = [head, ...pieces.filter(([, it]) => it.slot === 'body' || it.slot === 'legs').map(([n]) => n)].filter(Boolean)
  }
  delete set.head
  if (set.pieces.length !== (items[page] ? 1 : 3)) console.warn(`  Atenção: conjunto "${page}" com peças ${JSON.stringify(set.pieces)}`)
}
console.log(`Conjuntos de invocador: ${Object.keys(sets).length}`)

// ---------- 4. Modificadores ----------

const modRows = await cargoAll(
  { tables: 'Modifiers', fields: 'id,name,damage,mana,size,velocity,knockback,speed,critical,tag,arpen', order_by: 'Modifiers.id' },
  'Modificadores',
)
const modifiers = {}
for (const r of modRows) {
  const m = {}
  for (const f of ['damage', 'mana', 'size', 'velocity', 'knockback', 'speed', 'critical', 'tag', 'arpen']) {
    if (r[f] !== '' && r[f] !== undefined) m[f] = Number(r[f])
  }
  // Nomes repetidos ("Deadly" comum e de À distância): a página chama o segundo de "Deadly2"
  let name = decode(r.name).trim()
  while (modifiers[name]) name = name.replace(/\d*$/, (d) => String(Number(d || 1) + 1))
  modifiers[name] = { id: Number(r.id), ...m }
}

const modPage = await wikitext('Modifiers')
const section = (title) => {
  const start = modPage.text.indexOf(`=== ${title} ===`)
  const end = modPage.text.indexOf('\n==', start + 10)
  return modPage.text.slice(start, end)
}
const tableNames = (text) => {
  const m = text.match(/\{\{\/table\s*\|[^|]*\|([^}]*)\}\}/)
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : []
}
const modCats = {}
for (const cat of ['Universal', 'Common', 'Melee', 'Ranged', 'Magic', 'Summon']) {
  modCats[cat.toLowerCase()] = tableNames(section(cat))
  if (!modCats[cat.toLowerCase()].length) console.warn(`  Atenção: não achei a lista de modificadores "${cat}"`)
  for (const n of modCats[cat.toLowerCase()]) if (!modifiers[n]) console.warn(`  Atenção: modificador "${n}" sem números na tabela Cargo`)
}

// Acessórios: "{{/row0|2=Menacing|change=+4%}}" dentro da seção "Accessory modifiers"
const accStart = modPage.text.indexOf('== Accessory modifiers ==')
const accText = modPage.text.slice(accStart, modPage.text.indexOf('== Weapon modifiers ==', accStart))
const accessoryMods = []
let effect = null
for (const line of accText.split('\n')) {
  const eff = line.match(/^\|\s*(?:rowspan=\d+\s*\|\s*)?\[\[([^\]|]+)/)
  if (eff) effect = eff[1]
  const mod = line.match(/(?:\|2=|\|change, tier, value\|)([A-Za-z]+?)2?\|change=([^}]+)\}\}/)
  if (mod && effect) accessoryMods.push({ name: mod[1], effect, value: mod[2].trim() })
}
modCats.accessory = accessoryMods

// Ordem da lista completa da página (do modificador mais valioso ao menos valioso)
modCats.order = tableNames(modPage.text.slice(modPage.text.indexOf('=== Complete list ===')))
if (modCats.order.length < 70) console.warn(`  Atenção: lista completa de modificadores com ${modCats.order.length} nomes`)

// Nomes PT oficiais (arquivos do jogo). Sem a pasta, mantém os do arquivo atual.
const OUT_PATH = join(ROOT, 'src/data/tools-data.json')
let modifierPt = {}
const locDir = process.argv[2]
if (locDir) {
  const readLoc = (file) =>
    JSON.parse(readFileSync(join(locDir, file), 'utf8').replace(/^﻿/, '').replace(/,(\s*[}\]])/g, '$1')).Prefix
  const en = readLoc('en-US.Items.json')
  const pt = readLoc('pt-BR.Items.json')
  for (const [key, enName] of Object.entries(en)) {
    // As chaves do jogo seguem o mesmo padrão dos nomes daqui ("Deadly2", "Quick2"); "IllTempered" → "Ill-Tempered"
    const name = modifiers[key] || modCats.accessory.some((a) => a.name === key) ? key : enName
    if (pt[key]) modifierPt[name] = pt[key].replace(/[()]/g, '').trim()
  }
} else if (existsSync(OUT_PATH)) {
  modifierPt = JSON.parse(readFileSync(OUT_PATH, 'utf8')).modifierPt ?? {}
}
for (const n of [...Object.keys(modifiers), ...accessoryMods.map((a) => a.name)]) if (!modifierPt[n]) console.warn(`  Atenção: modificador "${n}" sem nome PT`)
console.log(`Modificadores: ${Object.keys(modifiers).length} de arma, ${accessoryMods.length} de acessório`)

// ---------- 5. Drops ----------

const dropRows = await cargoAll(
  { tables: 'Drops', fields: 'nameraw,item,rate,normal,expert,master', order_by: 'Drops._ID' },
  'Drops',
)
const drops = {}
for (const r of dropRows) {
  const item = decode(r.item).trim()
  if (!items[item]) continue
  const rateText = decode(r.rate)
  const sort = rateText.match(/data-sort-value="([\d.]+)"/)?.[1]
  const pct = sort ? Number(sort) : num(rateText.replace(/\[\[[^|\]]*\|/g, ''))
  const mode = r.normal === '1' ? null : r.expert === '1' ? 'expert' : r.master === '1' ? 'master' : null
  const list = (drops[item] ??= [])
  const source = decode(r.nameraw).trim()
  if (!list.some((d) => d[0] === source)) list.push(mode ? [source, pct, mode] : [source, pct])
}
for (const [item, list] of Object.entries(drops)) drops[item] = list.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 6)
console.log(`Itens com drops: ${Object.keys(drops).length}`)

// ---------- Montagem ----------

// Itens como arrays curtos (o arquivo fica bem menor). A ordem dos campos está em `fields`.
const FIELDS = ['kind', 'class', 'cat', 'slot', 'set', 'damage', 'useTime', 'knockback', 'crit', 'velocity', 'mana', 'rare', 'defense', 'autoswing', 'hardmode', 'buffs', 'debuffs', 'consumable']
const compact = {}
for (const [name, it] of Object.entries(items)) {
  const row = FIELDS.map((f) => {
    const v = it[f]
    if (Array.isArray(v)) return v.length ? v : 0
    if (v === false || v === null) return 0
    if (v === true) return 1
    return v
  })
  while (row.length && row[row.length - 1] === 0) row.pop()
  compact[name] = row
}

// Itens exclusivos de Expert (raridade -12) e Mestre (-13): de TODA a tabela Items, não só dos tipos acima
// (para o ExclusiveBadge funcionar em qualquer item). Um nome pode ter várias linhas: basta uma ser exclusiva.
const exclusive = {}
const rareRows = await cargoAll(
  { tables: 'Items', fields: 'Items.name=name,Items.rare=rare', where: 'Items.rare IN (-12,-13)', order_by: 'Items._ID' },
  'Itens exclusivos',
)
for (const r of rareRows) {
  const mode = { '-12': 'expert', '-13': 'master' }[String(r.rare).trim()]
  const name = decode(r.name)
  if (mode && name) exclusive[name] = exclusive[name] === 'expert' ? 'expert' : mode
}
const exclusiveSorted = Object.fromEntries(Object.entries(exclusive).sort(([a], [b]) => a.localeCompare(b)))

const out = {
  source: {
    date: new Date().toISOString().slice(0, 10),
    modifiersRevid: modPage.revid,
    minionsRevid: minionTable.revid,
    sentriesRevid: sentryTable.revid,
  },
  fields: FIELDS,
  items: compact,
  equip,
  sets,
  modifiers,
  modCats,
  modifierPt,
  drops,
  vendors,
  exclusive: exclusiveSorted,
}
writeFileSync(OUT_PATH, JSON.stringify(out))
console.log(`Gravado ${OUT_PATH} (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`)
