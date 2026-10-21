// Busca local no dicionário PT-BR ↔ EN (src/data/dictionary.json).
// Funciona sem internet: o dicionário vem junto com o app.

export interface DictMatch {
  pt: string
  en: string
  /** Título da página na wiki em inglês (pode ter "#seção") */
  page: string
  type: string
  score: number
}

interface Entry {
  pt: string
  en: string
  page: string
  type: string
  fields: { norm: string; tokens: string[] }[]
}

/** "Exército Goblin!" → "exercito goblin" */
export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Palavras pequenas que podem faltar sem problema ("espada cobre" acha "Espada de Cobre")
export const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'of', 'the', 'and'])

// Tipos que costumam ser o que a pessoa procura ganham um empurrãozinho no ranking
const TYPE_BONUS: Record<string, number> = { chefe: 40, evento: 40, bioma: 30, guia: 30, npc: 15, item: 0, buff: -10, página: -5 }

let dictionary: Promise<Entry[]> | null = null

/** Carrega o dicionário uma vez só (ele fica num arquivo separado, baixado na primeira busca). */
export function loadDictionary(): Promise<Entry[]> {
  dictionary ??= import('../data/dictionary.json').then(({ default: json }) => {
    // Formato compacto gerado por scripts/build-dictionary.mjs: [pt, en, índice do tipo, página?]
    const data = json as unknown as { types: string[]; entries: (string | number)[][] }
    return data.entries.map(([pt, en, typeIndex, page]) => {
      const entry = { pt: pt as string, en: en as string, page: (page ?? en) as string, type: data.types[typeIndex as number] }
      return {
        ...entry,
        fields: [entry.pt, entry.en].map((name) => {
          const norm = normalize(name)
          return { norm, tokens: norm.split(' ') }
        }),
      }
    })
  })
  return dictionary
}

/**
 * Distância de edição: quantas letras é preciso trocar, apagar, inserir
 * (ou inverter duas vizinhas) para transformar `a` em `b`. Para cedo se passar de `max`.
 */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prev2[j - 2] + 1)
      cur.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

/** Quantos erros de digitação aceitamos numa palavra, de acordo com o tamanho dela. */
function allowedTypos(word: string) {
  return word.length <= 3 ? 0 : word.length <= 8 ? 1 : 2
}

/**
 * Compara uma palavra digitada com as palavras de um nome.
 * Devolve quantos "erros" custou (0 = exata ou começo de palavra), ou -1 se não encontrou.
 */
export function matchToken(queryToken: string, tokens: string[], isLast: boolean) {
  let best = -1
  for (const token of tokens) {
    if (token === queryToken) return 0
    // Começo de palavra: aceito na última palavra (ainda sendo digitada) ou em palavras de 3+ letras
    if ((isLast || queryToken.length >= 3) && token.startsWith(queryToken)) return 0
    const max = allowedTypos(queryToken)
    if (max === 0) continue
    const dist = Math.min(
      editDistance(queryToken, token, max),
      isLast ? editDistance(queryToken, token.slice(0, queryToken.length), max) : max + 1,
    )
    if (dist <= max && (best === -1 || dist < best)) best = dist
  }
  return best
}

// Pontuação máxima de um resultado "parecido" (com erro de digitação)
const FUZZY_MAX = 400

function scoreField(query: string, queryTokens: string[], field: { norm: string; tokens: string[] }) {
  const { norm, tokens } = field
  const lengthPenalty = norm.length * 0.8
  if (norm === query) return 1000
  if (norm.startsWith(query)) return 800 - lengthPenalty
  if (norm.includes(query)) return 550 - lengthPenalty

  // Palavra por palavra (em qualquer ordem), tolerando erros de digitação
  let typos = 0
  let matched = 0
  for (let i = 0; i < queryTokens.length; i++) {
    const qt = queryTokens[i]
    const dist = matchToken(qt, tokens, i === queryTokens.length - 1)
    if (dist === -1) {
      if (STOPWORDS.has(qt)) continue
      return 0
    }
    matched++
    typos += dist
  }
  if (matched === 0) return 0
  return (typos === 0 ? 600 : FUZZY_MAX - typos * 60) - lengthPenalty
}

/** Procura no dicionário em português e inglês. Ignora acentos, maiúsculas e pequenos erros. */
export async function searchDictionary(query: string, limit = 8): Promise<DictMatch[]> {
  const q = normalize(query)
  if (!q) return []
  const queryTokens = q.split(' ')
  const entries = await loadDictionary()

  // Vários nomes podem levar à mesma página: fica só o melhor de cada uma
  const bestByPage = new Map<string, DictMatch & { fuzzy: boolean }>()
  let hasGoodMatch = false
  for (const entry of entries) {
    const score = Math.max(...entry.fields.map((f) => scoreField(q, queryTokens, f)))
    if (score <= 0) continue
    const fuzzy = score <= FUZZY_MAX
    if (!fuzzy) hasGoodMatch = true
    // Páginas de desambiguação ("Moon (disambiguation)") só listam outras páginas: ficam mais pra baixo
    const disambiguation = entry.en.endsWith('(disambiguation)') ? -300 : 0
    const total = score + (TYPE_BONUS[entry.type] ?? 0) + disambiguation
    const current = bestByPage.get(entry.page)
    if (!current || total > current.score) {
      bestByPage.set(entry.page, { pt: entry.pt, en: entry.en, page: entry.page, type: entry.type, score: total, fuzzy })
    }
  }

  // Se achou algo bom, esconde os "parecidos" (evita "zenite" sugerir "Lente")
  return [...bestByPage.values()]
    .filter((m) => !hasGoodMatch || !m.fuzzy)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ fuzzy: _, ...match }) => match)
}

/** Nome em português de uma página da wiki ("Moon Lord" → "Senhor da Lua"), se existir. */
export async function ptNameForPage(page: string): Promise<string | undefined> {
  const key = page.toLowerCase()
  const entries = (await loadDictionary()).filter((e) => e.page.toLowerCase() === key)
  // Prefere o nome oficial (inglês igual ao título) em vez de apelidos
  const best = entries.find((e) => e.en.toLowerCase() === key) ?? entries[0]
  return best && normalize(best.pt) !== normalize(best.en) ? best.pt : undefined
}

/** "Lua de Sangue (Blood Moon)" — ou só um nome, quando os dois são iguais. */
export function displayName(match: { pt: string; en: string }) {
  const en = match.en.replace(/ \(disambiguation\)$/, ', desambiguação')
  return normalize(match.pt) === normalize(match.en) ? match.en : `${match.pt} (${en})`
}
