import { buildVideos, type VideoItem } from './bilibiliMock'
import { getFavorites, getHistory } from './localState'
import { rememberVideos } from './videoCache'
import { putUserVideoBlob } from './videoBlobDb'

const KEY = 'donk666.content.v2'

export type StoredComment = { id: string; text: string; at: number; user: string }
export type StoredDm = { id: string; text: string; at: number }
export type StoredNotif = { id: string; text: string; at: number; read: boolean }
export type StoredPublish = { id: string; title: string; body: string; at: number }

export type VideoStats = {
  likes: number
  coins: number
  userLiked: boolean
  userCoined: boolean
}

type Store = {
  v: 2
  videos: Record<string, VideoItem>
  comments: Record<string, StoredComment[]>
  danmaku: Record<string, StoredDm[]>
  stats: Record<string, VideoStats>
  follows: Record<string, boolean>
  notifs: StoredNotif[]
  published: StoredPublish[]
}

function hashId(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) throw new Error('empty')
    const p = JSON.parse(raw) as Store
    if (p?.v !== 2 || !p.videos) throw new Error('bad')
    return p
  } catch {
    return {
      v: 2,
      videos: {},
      comments: {},
      danmaku: {},
      stats: {},
      follows: {},
      notifs: [],
      published: [],
    }
  }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function upsertVideos(list: VideoItem[]) {
  const s = read()
  for (const v of list) {
    s.videos[v.id] = v
    if (!s.stats[v.id]) {
      if (v.isUserUpload) {
        s.stats[v.id] = { likes: 0, coins: 0, userLiked: false, userCoined: false }
      } else {
        const h = hashId(v.id)
        s.stats[v.id] = {
          likes: 500 + (h % 2000),
          coins: 50 + (h % 300),
          userLiked: false,
          userCoined: false,
        }
      }
    }
    if (!s.comments[v.id]?.length) {
      s.comments[v.id] = [
        { id: uid(), text: '先占个沙发～', at: Date.now() - 86400000, user: '路人甲' },
        { id: uid(), text: '讲得很清楚，收藏了', at: Date.now() - 3600000, user: '学习者' },
      ]
    }
    if (!s.danmaku[v.id]?.length) {
      s.danmaku[v.id] = [
        { id: uid(), text: '学到了', at: Date.now() - 7200000 },
        { id: uid(), text: 'UP 加油', at: Date.now() - 3600000 },
      ]
    }
  }
  write(s)
  rememberVideos(list)
}

export function ensureVideo(v: VideoItem) {
  upsertVideos([v])
}

export function ensureSeedFeed() {
  const s = read()
  if (Object.keys(s.videos).length < 6) {
    upsertVideos(buildVideos(0))
  }
  const s2 = read()
  if (s2.notifs.length === 0) {
    s2.notifs.unshift({
      id: uid(),
      text: '欢迎使用 donk666：推荐/分区/详情等为前端演示数据；登录、头像、改密仍走你的真实后端。',
      at: Date.now(),
      read: false,
    })
    write(s2)
  }
}

export function getVideo(id: string): VideoItem | undefined {
  return read().videos[id]
}

export function getFollowingCount(): number {
  return Object.values(read().follows).filter(Boolean).length
}

/** 当前用户在本地点赞过的视频（用于空间页「最近点赞」） */
export function getLikedVideoItems(limit = 12): VideoItem[] {
  const s = read()
  const out: VideoItem[] = []
  for (const [vid, st] of Object.entries(s.stats)) {
    if (st.userLiked && s.videos[vid]) out.push(s.videos[vid])
  }
  return out.slice(0, limit)
}

/** 收藏夹内已缓存详情的视频 */
export function getFavoriteVideosForList(limit = 24): VideoItem[] {
  const s = read()
  const out: VideoItem[] = []
  for (const id of getFavorites()) {
    const v = s.videos[id]
    if (v) out.push(v)
    if (out.length >= limit) break
  }
  return out
}

/** 空间顶栏数字：关注、演示粉丝、本人上传稿件获赞总和 */
export function getSpaceHeaderStats(author: string): {
  following: number
  fans: number
  likesOnUploads: number
  uploads: number
} {
  const s = read()
  const following = getFollowingCount()
  const seed = hashId(author || 'me')
  const fans = 2 + (seed % 998)
  let likesOnUploads = 0
  let uploads = 0
  for (const v of Object.values(s.videos)) {
    if (v.isUserUpload && v.author === author) {
      uploads += 1
      likesOnUploads += s.stats[v.id]?.likes ?? 0
    }
  }
  return { following, fans, likesOnUploads, uploads }
}

export function pickRelated(excludeId: string, n = 8): VideoItem[] {
  const sortSlice = (arr: VideoItem[]) => {
    const h = hashId(excludeId)
    return [...arr].sort((a, b) => (hashId(a.id) ^ h) - (hashId(b.id) ^ h)).slice(0, n)
  }
  let all = Object.values(read().videos).filter((v) => v.id !== excludeId)
  if (all.length < n) {
    upsertVideos(buildVideos(hashId(excludeId) % 500))
    all = Object.values(read().videos).filter((v) => v.id !== excludeId)
  }
  return sortSlice(all)
}

function tokenizeTitle(t: string) {
  return new Set(
    t
      .split(/[\s·|【】/，,。.]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1),
  )
}

/** 根据观看历史、收藏、点赞、关注作者打分，用于「猜你喜欢」 */
function smartScoreMap(): Map<string, number> {
  const s = read()
  const catW = new Map<string, number>()
  const authorW = new Map<string, number>()
  const historyIds = getHistory()
    .slice(0, 40)
    .map((h) => h.id)
  const favIds = getFavorites()

  const bump = (v: VideoItem | undefined) => {
    if (!v) return
    catW.set(v.category, (catW.get(v.category) ?? 0) + 2)
    authorW.set(v.author, (authorW.get(v.author) ?? 0) + 2)
  }

  for (const id of historyIds) bump(s.videos[id])
  for (const id of favIds) bump(s.videos[id])

  for (const [vid, st] of Object.entries(s.stats)) {
    if (st.userLiked) bump(s.videos[vid])
  }

  for (const [author, on] of Object.entries(s.follows)) {
    if (on) authorW.set(author, (authorW.get(author) ?? 0) + 3)
  }

  const scores = new Map<string, number>()
  const historyTitles = historyIds
    .map((id) => s.videos[id]?.title)
    .filter(Boolean) as string[]

  for (const v of Object.values(s.videos)) {
    let sc = hashId(v.id) % 5
    sc += (catW.get(v.category) ?? 0) * 6
    sc += (authorW.get(v.author) ?? 0) * 5
    if (v.isUserUpload) sc += 4

    const words = tokenizeTitle(v.title)
    for (const ht of historyTitles.slice(0, 12)) {
      for (const w of tokenizeTitle(ht)) {
        if (words.has(w)) sc += 4
      }
    }
    scores.set(v.id, sc)
  }
  return scores
}

export function getSmartRecommend(limit = 12): VideoItem[] {
  ensureSeedFeed()
  const s = read()
  let all = Object.values(s.videos)
  if (all.length < 4) {
    upsertVideos(buildVideos(42))
    all = Object.values(read().videos)
  }
  const scores = smartScoreMap()
  return [...all].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)).slice(0, limit)
}

export function pickSmartRelated(excludeId: string, n = 8): VideoItem[] {
  const scores = smartScoreMap()
  let all = Object.values(read().videos).filter((v) => v.id !== excludeId)
  if (all.length < n) {
    upsertVideos(buildVideos(hashId(excludeId) % 400))
    all = Object.values(read().videos).filter((v) => v.id !== excludeId)
  }
  return [...all].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)).slice(0, n)
}

export function getUserUploads(): VideoItem[] {
  return Object.values(read().videos).filter((v) => v.isUserUpload)
}

export function mergeFeedWithUploads(base: VideoItem[]): VideoItem[] {
  const ups = getUserUploads()
  const ids = new Set(ups.map((u) => u.id))
  return [...ups, ...base.filter((b) => !ids.has(b.id))]
}

export async function addUserUploadedVideo(params: {
  file: Blob
  title: string
  category: string
  author: string
  cover: string
  duration: string
}): Promise<VideoItem> {
  const id = uid()
  await putUserVideoBlob(id, params.file)
  const item: VideoItem = {
    id,
    title: params.title.trim() || '未命名视频',
    cover: params.cover,
    plays: '0',
    comments: '0',
    duration: params.duration,
    author: params.author.trim() || '我',
    date: '刚刚',
    tag: '本地上传',
    category: params.category,
    isUserUpload: true,
    hasLocalBlob: true,
  }
  upsertVideos([item])
  addNotification(`视频已入库（本机）：${item.title}`)
  window.dispatchEvent(new CustomEvent('donk666-content'))
  return item
}

export function getStats(videoId: string): VideoStats {
  const s = read()
  if (!s.stats[videoId]) {
    upsertVideos([
      s.videos[videoId] ||
        ({
          id: videoId,
          title: '视频',
          cover: '',
          plays: '0',
          comments: '0',
          duration: '0:00',
          author: 'UP',
          date: '-',
          category: '推荐',
        } as VideoItem),
    ])
  }
  return read().stats[videoId]!
}

export function toggleLike(videoId: string): VideoStats {
  const s = read()
  const st = { ...getStats(videoId) }
  if (st.userLiked) {
    st.likes = Math.max(0, st.likes - 1)
    st.userLiked = false
  } else {
    st.likes += 1
    st.userLiked = true
  }
  s.stats[videoId] = st
  write(s)
  return st
}

export function giveCoin(videoId: string): VideoStats {
  const s = read()
  const st = { ...getStats(videoId) }
  if (st.userCoined) {
    return st
  }
  st.coins += 1
  st.userCoined = true
  s.stats[videoId] = st
  write(s)
  return st
}

export function getComments(videoId: string): StoredComment[] {
  const s = read()
  return s.comments[videoId] ?? []
}

export function addComment(videoId: string, text: string, user: string) {
  const s = read()
  const row: StoredComment = { id: uid(), text, at: Date.now(), user }
  s.comments[videoId] = [row, ...(s.comments[videoId] ?? [])]
  write(s)
  return s.comments[videoId]
}

export function getDanmaku(videoId: string): StoredDm[] {
  const s = read()
  return s.danmaku[videoId] ?? []
}

export function addDanmaku(videoId: string, text: string) {
  const s = read()
  const row: StoredDm = { id: uid(), text, at: Date.now() }
  s.danmaku[videoId] = [...(s.danmaku[videoId] ?? []), row].slice(-200)
  write(s)
  return s.danmaku[videoId]
}

export function authorKey(author: string) {
  return author.trim() || 'unknown'
}

export function isFollowingAuthor(author: string): boolean {
  return !!read().follows[authorKey(author)]
}

export function toggleFollowAuthor(author: string): boolean {
  const s = read()
  const k = authorKey(author)
  s.follows[k] = !s.follows[k]
  write(s)
  return !!s.follows[k]
}

export function getNotifications(): StoredNotif[] {
  return read().notifs
}

export function addNotification(text: string) {
  const s = read()
  s.notifs.unshift({ id: uid(), text, at: Date.now(), read: false })
  s.notifs = s.notifs.slice(0, 100)
  write(s)
}

export function markAllNotificationsRead() {
  const s = read()
  s.notifs = s.notifs.map((n) => ({ ...n, read: true }))
  write(s)
}

export function getPublished(): StoredPublish[] {
  return read().published
}

export function addPublished(title: string, body: string) {
  const s = read()
  const row: StoredPublish = { id: uid(), title: title.trim(), body: body.trim(), at: Date.now() }
  s.published.unshift(row)
  s.published = s.published.slice(0, 50)
  write(s)
  addNotification(`投稿已记录（本地）：${row.title}`)
  return s.published
}

export function unreadNotificationCount(): number {
  return read().notifs.filter((n) => !n.read).length
}
