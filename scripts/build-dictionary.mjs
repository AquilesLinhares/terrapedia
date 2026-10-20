// Monta o dicionário PT-BR ↔ EN usado pela busca em português.
//
// Fontes, em ordem de prioridade:
//   1. Traduções oficiais do jogo (extraídas do Terraria.exe com extract-terraria-loc.ps1)
//   2. Links de idioma da wiki (página em inglês → página da wiki em português)
//   3. Lista manual (scripts/manual-names.json) para eventos e termos sem tradução oficial
//
// Cada nome em inglês é conferido na wiki: se não existe página (nem redirecionamento),
// a entrada é descartada. Redirecionamentos são resolvidos para o título final.
//
// Uso: node scripts/build-dictionary.mjs <pasta-com-os-arquivos-de-tradução>
// Saída: src/data/dictionary.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://terraria.wiki.gg/api.php'
const HEADERS = { 'User-Agent': 'TerrapediaDictionaryBuilder/0.1 (https://github.com/AquilesLinhares/terrapedia)' }

const locDir = process.argv[2]
if (!locDir) {
  console.error('Uso: node scripts/build-dictionary.mjs <pasta-com-os-arquivos-de-tradução>')
  process.exit(1)
}

// ---------- 1. Traduções oficiais do jogo ----------

// Os arquivos do jogo têm vírgulas sobrando no fim das listas; o JSON.parse não aceita.
function readLoc(file) {
  const text = readFileSync(join(locDir, file), 'utf8').replace(/^\uFEFF/, '').replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(text)
}

function loadLang(lang) {
  const merged = {}
  for (const part of ['', '.Items', '.NPCs', '.Game']) Object.assign(merged, readLoc(`${lang}${part}.json`))
  return merged
}

const en = loadLang('en-US')
const pt = loadLang('pt-BR')

// Alguns nomes apontam para outros: "{$ItemName.DemonAltar}"
function resolveRefs(text, lang, depth = 0) {
  return text.replace(/\{\$(\w+)\.(\w+)\}/g, (match, group, key) =>
    depth < 3 && lang[group]?.[key] ? resolveRefs(lang[group][key], lang, depth + 1) : match,
  )
}

// Categoria do arquivo do jogo → tipo mostrado no app
const GAME_GROUPS = {
  ItemName: 'item',
  NPCName: 'npc',
  BuffName: 'buff',
  Bestiary_Biomes: 'bioma',
  Bestiary_Invasions: 'evento',
  Bestiary_Events: 'evento',
}

const candidates = [] // { pt, en, type, source }
for (const [group, type] of Object.entries(GAME_GROUPS)) {
  for (const [key, enRaw] of Object.entries(en[group] ?? {})) {
    const ptRaw = pt[group]?.[key]
    if (!ptRaw) continue
    const enName = resolveRefs(enRaw, en).trim()
    const ptName = resolveRefs(ptRaw, pt).trim()
    if (!enName || !ptName || enName.includes('{') || ptName.includes('{')) continue
    candidates.push({ pt: ptName, en: enName, type, source: 'jogo' })
  }
}
console.log(`Jogo: ${candidates.length} nomes`)

// ---------- Conferir os nomes em inglês na wiki ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Uma requisição por vez, com pausa entre elas, pra não sobrecarregar a wiki.
// Se ela responder 429 ("muitas requisições"), espera o tempo que ela pedir e tenta de novo.
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`
  for (let attempt = 1; ; attempt++) {
    await sleep(400)
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after')) || 10 * attempt
        throw Object.assign(new Error(`HTTP ${res.status}`), { wait })
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error?.code === 'maxlag') throw Object.assign(new Error('maxlag'), { wait: 5 })
      return data
    } catch (err) {
      if (attempt >= 8) throw err
      const wait = err.wait ?? 2 * attempt
      process.stdout.write(`\n  (${err.message}: esperando ${wait}s)\n`)
      await sleep(wait * 1000)
    }
  }
}

/** Para cada título, descobre a página final (seguindo redirecionamentos) ou null se não existe. */
async function resolveTitles(titles) {
  const result = new Map()
  const unique = [...new Set(titles)]
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50)
    const data = await api({ action: 'query', titles: batch.join('|'), redirects: '1' })
    const q = data.query ?? {}
    const normalized = new Map((q.normalized ?? []).map((n) => [n.from, n.to]))
    const redirects = new Map((q.redirects ?? []).map((r) => [r.from, r.tofragment ? `${r.to}#${r.tofragment}` : r.to]))
    const existing = new Set((q.pages ?? []).filter((p) => !p.missing && !p.invalid && p.ns === 0).map((p) => p.title))
    for (const title of batch) {
      const norm = normalized.get(title) ?? title
      const target = redirects.get(norm) ?? norm
      result.set(title, existing.has(target.split('#')[0]) ? target : null)
    }
    process.stdout.write(`\rConferindo na wiki: ${Math.min(i + 50, unique.length)}/${unique.length}`)
  }
  process.stdout.write('\n')
  return result
}

// ---------- 2. Links de idioma da wiki (inglês → português) ----------

async function fetchLangLinks() {
  const pairs = []
  let cont = {}
  do {
    const data = await api({
      action: 'query',
      generator: 'allpages',
      gapnamespace: '0',
      gapfilterredir: 'nonredirects',
      gaplimit: '500',
      prop: 'langlinks',
      lllang: 'pt',
      lllimit: '500',
      ...cont,
    })
    for (const page of data.query?.pages ?? []) {
      // Subpáginas ("Blood Moon/cs", "Debuffs/weaponsRow") são traduções ou peças técnicas, não artigos
      if (page.title.includes('/')) continue
      for (const link of page.langlinks ?? []) pairs.push({ pt: link.title, en: page.title })
    }
    cont = data.continue ?? null
    process.stdout.write(`\rLinks de idioma da wiki: ${pairs.length}`)
  } while (cont)
  process.stdout.write('\n')
  return pairs
}

// ---------- Montagem ----------

const normalize = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const resolved = await resolveTitles(candidates.map((c) => c.en))

const manual = JSON.parse(readFileSync(join(ROOT, 'scripts', 'manual-names.json'), 'utf8'))
const manualResolved = await resolveTitles(manual.map((m) => m.en))

const langLinks = await fetchLangLinks()

const entries = []
const seen = new Set()
function add(entry) {
  // Nome da wiki em português às vezes tem "(desambiguação)" ou "/subpágina": limpamos
  const ptName = entry.pt.replace(/\s*\(.*?\)\s*$/, '').trim()
  const key = `${normalize(ptName)}|${entry.page}`
  if (!ptName || seen.has(key)) return
  seen.add(key)
  entries.push({ pt: ptName, en: entry.en, type: entry.type, page: entry.page })
}

// A lista manual entra primeiro: assim "Senhor da Lua" fica com o tipo "chefe" em vez de "npc"
for (const m of manual) {
  const page = manualResolved.get(m.en)
  if (!page) {
    console.warn(`  Atenção: manual "${m.en}" não existe na wiki`)
    continue
  }
  for (const ptName of [m.pt, ...(m.aliases ?? [])]) add({ pt: ptName, en: m.en, page, type: m.type })
}

let dropped = 0
for (const c of candidates) {
  const page = resolved.get(c.en)
  if (page) add({ ...c, page })
  else dropped++
}
console.log(`Jogo: ${dropped} nomes sem página na wiki foram descartados`)

// Da wiki só interessa quando o nome em português é diferente (não "1.0" → "1.0")
for (const l of langLinks) {
  if (normalize(l.pt) !== normalize(l.en)) add({ pt: l.pt, en: l.en, page: l.en, type: 'página' })
}

entries.sort((a, b) => a.pt.localeCompare(b.pt, 'pt-BR'))

// Formato compacto pra deixar o arquivo pequeno: [pt, en, índice do tipo, página?]
// A página só é guardada quando é diferente do nome em inglês.
const types = [...new Set(entries.map((e) => e.type))]
const rows = entries.map((e) => {
  const row = [e.pt, e.en, types.indexOf(e.type)]
  if (e.page !== e.en) row.push(e.page)
  return row
})

mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })
const outFile = join(ROOT, 'src', 'data', 'dictionary.json')
writeFileSync(
  outFile,
  JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    sources: 'Nomes oficiais do Terraria (pt-BR), links de idioma da terraria.wiki.gg e lista manual',
    types,
    entries: rows,
  }),
)
console.log(`Pronto: ${entries.length} entradas em ${outFile}`)
