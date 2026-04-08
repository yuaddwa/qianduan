export type VideoItem = {
  id: string
  title: string
  cover: string
  plays: string
  comments: string
  duration: string
  author: string
  date: string
  tag?: string
  /** 内容分区（用于首页分类筛选，不含「动态」「热门」） */
  category: string
  /** 本机上传，二进制在 IndexedDB */
  isUserUpload?: boolean
  hasLocalBlob?: boolean
}

export type CarouselSlide = {
  id: string
  title: string
  image: string
}

export const navLinks = [
  '首页',
  '番剧',
  '直播',
  '游戏中心',
  '会员购',
  '漫画',
  '赛事',
]

export const categoryTags = [
  '动态',
  '热门',
  '番剧',
  '国创',
  '综艺',
  '动画',
  '鬼畜',
  '音乐',
  '舞蹈',
  '影视',
  '娱乐',
  '知识',
  '科技数码',
  '美食',
  '汽车',
  '体育运动',
  '时尚美妆',
  '更多',
]

/** 给视频随机分配的分区池（与中间分类一致，不含「动态」「热门」） */
export const videoCategoryPool = categoryTags.filter((t) => t !== '动态' && t !== '热门' && t !== '更多')

export const utilityTiles = [
  { icon: '📤', label: '上传视频' },
  { icon: '📰', label: '专栏' },
  { icon: '📺', label: '直播' },
  { icon: '🎯', label: '活动' },
  { icon: '🎓', label: '课堂' },
  { icon: '🎮', label: '游戏' },
  { icon: '⭐', label: '社区' },
]

const seeds = [
  'bili-a', 'bili-b', 'bili-c', 'bili-d', 'bili-e', 'bili-f', 'bili-g', 'bili-h', 'bili-i', 'bili-j', 'bili-k', 'bili-l',
]

const titles = [
  '前后端怎么连接起来 · 实战笔记',
  '【合集】一周内学会 React 全家桶',
  '这个 UI 细节让转化率翻倍',
  '下雪天的城市漫步 · 白噪音',
  '程序员の周末：服务器维护实录',
  '吃播探店：小巷里的老字号面馆',
  '高燃混剪 · 一秒入魂',
  '机器学习入门：从 sklearn 到部署',
  '旅拍 4K：云海与日出的 30 秒',
  '桌搭分享 | 程序员生产力桌面',
]

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length]
}

export function buildVideos(offset = 0): VideoItem[] {
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + offset
    const seed = pick(seeds, n)
    return {
      id: `v-${n}-${seed}`,
      title: `${pick(titles, n)}`,
      cover: `https://picsum.photos/seed/${seed}/400/250`,
      plays: `${(Math.random() * 80 + 5).toFixed(1)}万`,
      comments: String(Math.floor(Math.random() * 2000 + 100)),
      duration: `${Math.floor(Math.random() * 15 + 1)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
      author: `UP主_${Math.floor(Math.random() * 900 + 100)}`,
      date: `${Math.floor(Math.random() * 6 + 1)}-前`,
      tag: Math.random() > 0.75 ? `${Math.floor(Math.random() * 9 + 1)}千点赞` : undefined,
      category: pick(videoCategoryPool, n),
    }
  })
}

/** 频道页：按分区生成稳定列表，避免随机 category 导致整页「暂无数据」 */
export function buildVideosForChannel(channel: string): VideoItem[] {
  let offset = 0
  for (let i = 0; i < channel.length; i++) {
    offset = (offset + channel.charCodeAt(i) * (i + 1)) % 997
  }
  const base = buildVideos(offset)
  if (channel === '热门') return base
  if (channel === '动态') return base.filter((_, i) => i % 2 === 0)
  return base.map((v, i) => ({
    ...v,
    id: `v-ch-${offset}-${i}-${encodeURIComponent(channel)}`,
    category: channel,
    title: i === 0 ? `【${channel}】${v.title}` : v.title,
  }))
}

export function buildCarousel(offset = 0): CarouselSlide[] {
  return [0, 1, 2, 3, 4].map((i) => ({
    id: `c-${offset}-${i}`,
    title: `推荐专题 ${offset + i + 1} · ${pick(titles, offset + i)}`,
    image: `https://picsum.photos/seed/car-${offset}-${i}/900/520`,
  }))
}

export function shuffleBatch() {
  return Math.floor(Math.random() * 1e6)
}
