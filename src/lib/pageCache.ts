// Cópia no aparelho (IndexedDB) de cada artigo que carregou com sucesso.
// Se a wiki cair ou a internet sumir, o app mostra a última cópia salva.

const DB_NAME = 'terrapedia'
const STORE = 'pages'

export interface SavedPage {
  title: string
  /** HTML como veio da wiki (antes do cleanArticle, para valer a limpeza mais nova) */
  html: string
  savedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

// "Eye_of_cthulhu", "eye of Cthulhu"... viram a mesma chave
const keyOf = (title: string) => title.replace(/_/g, ' ').trim().toLowerCase()

/** Salva o artigo com o título pedido e com o título real (quando foi um redirecionamento). */
export async function savePage(requested: string, page: Omit<SavedPage, 'savedAt'>) {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    const value: SavedPage = { ...page, savedAt: Date.now() }
    for (const key of new Set([keyOf(requested), keyOf(page.title)])) tx.objectStore(STORE).put(value, key)
  } catch {
    // Sem IndexedDB (ex.: janela anônima de alguns navegadores): só não salva
  }
}

export async function loadPage(title: string): Promise<SavedPage | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(keyOf(title))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
