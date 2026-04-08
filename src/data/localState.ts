export type HistoryItem = {
  id: string
  at: number
}

const KEY_HISTORY = 'donk666.history.v1'
const KEY_FAVORITES = 'donk666.favorites.v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function addHistory(id: string) {
  const list = readJson<HistoryItem[]>(KEY_HISTORY, [])
  const next = [{ id, at: Date.now() }, ...list.filter((x) => x.id !== id)].slice(0, 200)
  writeJson(KEY_HISTORY, next)
  return next
}

export function getHistory() {
  return readJson<HistoryItem[]>(KEY_HISTORY, [])
}

export function clearHistory() {
  writeJson(KEY_HISTORY, [])
}

export function getFavorites() {
  return readJson<string[]>(KEY_FAVORITES, [])
}

export function isFavorite(id: string) {
  return getFavorites().includes(id)
}

export function toggleFavorite(id: string) {
  const list = getFavorites()
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]
  writeJson(KEY_FAVORITES, next)
  return next
}

const KEY_POST_DRAFT = 'donk666.util.postDraft.v1'
export type PostDraft = { title: string; body: string; updatedAt: number }

export function getPostDraft(): PostDraft | null {
  return readJson<PostDraft | null>(KEY_POST_DRAFT, null)
}

export function setPostDraft(d: PostDraft) {
  writeJson(KEY_POST_DRAFT, d)
}

const KEY_COMMUNITY = 'donk666.util.community.v1'
export type CommunityPost = { id: string; text: string; at: number }

export function getCommunityPosts(): CommunityPost[] {
  return readJson<CommunityPost[]>(KEY_COMMUNITY, [])
}

export function addCommunityPost(text: string) {
  const t = text.trim()
  if (!t) return getCommunityPosts()
  const next: CommunityPost[] = [
    { id: `c-${Date.now()}`, text: t, at: Date.now() },
    ...getCommunityPosts(),
  ].slice(0, 50)
  writeJson(KEY_COMMUNITY, next)
  return next
}

