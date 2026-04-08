import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import {
  buildCarousel,
  buildVideos,
  categoryTags,
  navLinks,
  shuffleBatch,
  utilityTiles,
  type VideoItem,
} from '../data/bilibiliMock'
import {
  ensureSeedFeed,
  getSmartRecommend,
  mergeFeedWithUploads,
  unreadNotificationCount,
  upsertVideos,
} from '../data/contentStore'
import { rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
}

function FeedCard({ v, className = '' }: { v: VideoItem; className?: string }) {
  return (
    <a
      className={className ? `bili-vcard ${className}` : 'bili-vcard'}
      href={`#/video/${encodeURIComponent(v.id)}`}
      onClick={(e) => {
        e.preventDefault()
        navigateHash(`/video/${encodeURIComponent(v.id)}`)
      }}
    >
      <div className="bili-vthumb-wrap">
        <img className="bili-vthumb" src={v.cover} alt="" loading="lazy" />
        <div className="bili-vmeta">
          <span className="bili-vplays">▶ {v.plays}</span>
          <span className="bili-vplays">💬 {v.comments}</span>
          <span className="bili-vduration">{v.duration}</span>
        </div>
      </div>
      <div className="bili-vbody">
        {v.tag ? <span className="bili-vtag">{v.tag}</span> : null}
        <div className="bili-vtitle">{v.title}</div>
        <div className="bili-vsub">
          <span>{v.author}</span>
          <span>{v.date}</span>
        </div>
      </div>
    </a>
  )
}

export default function Home({ session, onLogout }: Props) {
  const [batch, setBatch] = useState(0)
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    ensureSeedFeed()
    return mergeFeedWithUploads(buildVideos(0))
  })
  const [carouselSlides, setCarouselSlides] = useState(() => buildCarousel(0))
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [search, setSearch] = useState('前后端怎么连接起来')
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>('热门')
  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [contentTick, setContentTick] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [feedEnd, setFeedEnd] = useState(false)
  /** 下一批 mock 视频的 offset（buildVideos 每批 12 条） */
  const nextMockOffsetRef = useRef(12)
  const loadingMoreLockRef = useRef(false)
  const feedSentinelRef = useRef<HTMLDivElement>(null)
  const videosLenRef = useRef(0)

  const byTag = useMemo(() => {
    if (!activeTag || activeTag === '热门') return videos
    if (activeTag === '动态') return videos.filter((_, i) => i % 2 === 0)
    return videos.filter((v) => v.category === activeTag)
  }, [videos, activeTag])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return byTag
    return byTag.filter((v) => v.title.includes(q) || v.author.includes(q))
  }, [byTag, query])

  const [wideFeedLayout, setWideFeedLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1101px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1101px)')
    const fn = () => setWideFeedLayout(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  /** 宽屏：轮播右侧 3×2；其下通栏再接其余视频（与 B 站首屏一致） */
  const topSixVideos = useMemo(
    () => (wideFeedLayout ? filtered.slice(0, 6) : []),
    [filtered, wideFeedLayout],
  )

  const belowVideos = useMemo(
    () => (wideFeedLayout ? filtered.slice(6) : filtered),
    [filtered, wideFeedLayout],
  )

  const goCarousel = useCallback(
    (delta: number) => {
      setCarouselIndex((i) => {
        const n = carouselSlides.length
        return (i + delta + n) % n
      })
    },
    [carouselSlides.length],
  )

  useEffect(() => {
    const id = window.setInterval(() => goCarousel(1), 4500)
    return () => window.clearInterval(id)
  }, [goCarousel])

  const doSearch = () => {
    const q = search.trim()
    setQuery(q)
    if (q) navigateHash(`/search/${encodeURIComponent(q)}`)
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600)
  }, [])

  const doShuffle = useCallback(() => {
    const next = shuffleBatch()
    setBatch(next)
    const offset = next % 1000
    const nextVideos = mergeFeedWithUploads(buildVideos(offset))
    setVideos(nextVideos)
    setCarouselSlides(buildCarousel(offset))
    setCarouselIndex(0)
    rememberVideos(nextVideos)
    nextMockOffsetRef.current = offset + 12
    setFeedEnd(false)
  }, [])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const slide = carouselSlides[carouselIndex] ?? carouselSlides[0]
  const catTagsShown = useMemo(() => categoryTags.slice(0, 18), [])
  const msgUnread = unreadNotificationCount()

  useEffect(() => {
    const onStore = () => {
      setContentTick((t) => t + 1)
      setVideos((prev) => mergeFeedWithUploads(prev))
    }
    window.addEventListener('donk666-content', onStore)
    return () => window.removeEventListener('donk666-content', onStore)
  }, [])

  const smartPicks = useMemo(() => getSmartRecommend(10), [batch, videos.length, contentTick])

  useEffect(() => {
    ensureSeedFeed()
  }, [])

  useEffect(() => {
    rememberVideos(videos)
    upsertVideos(videos)
  }, [videos])

  useEffect(() => {
    videosLenRef.current = videos.length
  }, [videos.length])

  const loadMoreFeed = useCallback(() => {
    if (loadingMoreLockRef.current || feedEnd) return
    if (videosLenRef.current >= 180) {
      setFeedEnd(true)
      return
    }
    loadingMoreLockRef.current = true
    setLoadingMore(true)
    const off = nextMockOffsetRef.current
    const chunk = buildVideos(off)
    nextMockOffsetRef.current = off + 12
    setVideos((prev) => {
      const ids = new Set(prev.map((v) => v.id))
      const extra = chunk.filter((v) => !ids.has(v.id))
      return extra.length ? [...prev, ...extra] : [...prev, ...chunk]
    })
    window.setTimeout(() => {
      loadingMoreLockRef.current = false
      setLoadingMore(false)
    }, 120)
  }, [feedEnd])

  useEffect(() => {
    const el = feedSentinelRef.current
    if (!el) return
    const ob = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        loadMoreFeed()
      },
      { root: null, rootMargin: '320px', threshold: 0 },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [loadMoreFeed])

  return (
    <div className="bili-page">
      <div className="bili-nav-wrap">
        <nav className="bili-nav">
          <a className="bili-logo" href="#/home">
            donk<span>666</span>
          </a>
          <div className="bili-nav-links">
            {navLinks.map((t) => (
              <a
                key={t}
                href={t === '首页' ? '#/home' : `#/channel/${encodeURIComponent(t)}`}
                className={t === '首页' ? 'is-active' : ''}
                onClick={(e) => {
                  e.preventDefault()
                  if (t === '首页') {
                    navigateHash('/home')
                    return
                  }
                  navigateHash(`/channel/${encodeURIComponent(t)}`)
                }}
              >
                {t}
              </a>
            ))}
          </div>

          <div className="bili-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="输入关键词搜索"
              aria-label="搜索"
            />
            <button type="button" onClick={doSearch} aria-label="搜索">
              🔍
            </button>
          </div>

          <div className="bili-nav-right">
            {session ? (
              <>
                <a className="bili-icon-btn" href="#/profile" title="个人中心">
                  {resolvePublicUrl(session.avatarUrl) ? (
                    <img
                      src={resolvePublicUrl(session.avatarUrl)}
                      alt=""
                      width={28}
                      height={28}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    '👤'
                  )}
                </a>
                <button
                  type="button"
                  className="bili-icon-btn"
                  title="消息中心"
                  onClick={() => navigateHash('/inbox')}
                >
                  💬
                  {msgUnread > 0 ? <span className="bili-badge">{msgUnread > 99 ? '99+' : msgUnread}</span> : null}
                </button>
                <button
                  type="button"
                  className="bili-icon-btn"
                  title="动态"
                  onClick={() => navigateHash('/channel/动态')}
                >
                  🔔
                  <span className="bili-badge">33</span>
                </button>
              </>
            ) : (
              <>
                <a className="bili-nav-links" href="#/login" style={{ marginLeft: 0 }}>
                  登录
                </a>
                <a className="bili-nav-links" href="#/register" style={{ marginLeft: 0 }}>
                  注册
                </a>
              </>
            )}
            <button type="button" className="bili-icon-btn" title="历史" onClick={() => navigateHash('/history')}>
              🕐
            </button>
            <button type="button" className="bili-icon-btn" title="收藏" onClick={() => navigateHash('/favorites')}>
              ⭐
            </button>
            <button type="button" className="bili-btn-post" onClick={() => navigateHash('/util/投稿')}>
              <span>📤</span> 投稿
            </button>
            {session ? (
              <button
                type="button"
                className="bili-shuffle"
                title="退出"
                onClick={() => void onLogout()}
              >
                退出
              </button>
            ) : null}
          </div>
        </nav>
      </div>

      <main className="bili-main">
        <section className="bili-cat-bar">
          <div className="bili-cat-left">
            <a
              className="bili-cat-pill"
              href="#/home"
              onClick={(e) => {
                e.preventDefault()
                setMoreOpen(false)
                setActiveTag('动态')
              }}
            >
              <span className="bili-cat-circle" aria-hidden>
                👤
              </span>
              <span>动态</span>
            </a>
            <a
              className="bili-cat-pill"
              href="#/home"
              onClick={(e) => {
                e.preventDefault()
                setMoreOpen(false)
                doShuffle()
                setActiveTag('热门')
              }}
            >
              <span className="bili-cat-circle is-hot" aria-hidden>
                🔥
              </span>
              <span>热门</span>
            </a>
          </div>
          <div className="bili-cat-tags" aria-label="内容分区">
            {catTagsShown.map((t) => (
              <a
                key={t}
                href={t === '更多' ? '#/home' : `#/channel/${encodeURIComponent(t)}`}
                className={activeTag === t ? 'is-active' : ''}
                onClick={(e) => {
                  e.preventDefault()
                  if (t === '更多') {
                    setMoreOpen((v) => !v)
                    return
                  }
                  if (t === '热门' || t === '动态') {
                    doShuffle()
                  }
                  setMoreOpen(false)
                  setActiveTag(t)
                  if (t !== '热门' && t !== '动态') {
                    navigateHash(`/channel/${encodeURIComponent(t)}`)
                  }
                }}
              >
                {t}
              </a>
            ))}
            {moreOpen ? (
              <div className="bili-more-pop" role="dialog" aria-label="更多分区">
                <div className="bili-more-hd">
                  <div>更多分区</div>
                  <button type="button" className="bili-more-x" onClick={() => setMoreOpen(false)} aria-label="关闭">
                    ×
                  </button>
                </div>
                <div className="bili-more-grid">
                  {categoryTags
                    .filter((t) => t !== '更多')
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={activeTag === t ? 'is-active' : ''}
                        onClick={() => {
                          if (t === '热门') doShuffle()
                          setActiveTag(t)
                          setMoreOpen(false)
                          if (t !== '热门' && t !== '动态') {
                            navigateHash(`/channel/${encodeURIComponent(t)}`)
                          }
                        }}
                      >
                        {t}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="bili-cat-right">
            <div className="bili-util-grid" aria-label="快捷入口">
              {utilityTiles.map((u) => (
                <button
                  key={u.label}
                  type="button"
                  className="bili-util-item"
                  onClick={() => navigateHash(`/util/${encodeURIComponent(u.label)}`)}
                >
                  <span className="bili-util-ic" aria-hidden>
                    {u.icon}
                  </span>
                  <span className="bili-util-txt">{u.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="bili-shuffle bili-cat-shuffle" onClick={doShuffle}>
              🔄 换一换
            </button>
          </div>
        </section>

        <div className="bili-feed-head">
          <h2 className="bili-feed-title">{!activeTag || activeTag === '热门' ? '推荐' : activeTag}</h2>
        </div>

        {activeTag === '热门' || activeTag === '动态' || !activeTag ? (
          <section className="donk-smart-strip" aria-label="智能推荐">
            <div className="donk-smart-strip-hd">
              <span className="donk-smart-strip-title">猜你喜欢</span>
              <span className="donk-smart-strip-sub">按观看历史 · 收藏 · 点赞 · 关注综合排序</span>
            </div>
            <div className="donk-smart-strip-row">
              {smartPicks.map((v) => (
                <a
                  key={v.id}
                  className="donk-smart-card"
                  href={`#/video/${encodeURIComponent(v.id)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigateHash(`/video/${encodeURIComponent(v.id)}`)
                  }}
                >
                  <div className="donk-smart-thumb">
                    <img src={v.cover} alt="" loading="lazy" />
                    {v.isUserUpload ? <span className="donk-smart-badge">上传</span> : null}
                  </div>
                  <div className="donk-smart-card-title">{v.title}</div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {query ? (
          <p style={{ color: 'var(--bili-sub)', margin: '0 0 12px' }}>
            搜索「{query}」 · 共 {filtered.length} 条
          </p>
        ) : null}

        <div
          className={`bili-feed-grid${wideFeedLayout && topSixVideos.length > 0 ? ' bili-feed-grid--with-top-six' : ''}`}
        >
          <div className="bili-feed-leftcol">
            <div className="bili-carousel">
              <div className="bili-carousel-inner">
                <img className="bili-carousel-img" src={slide.image} alt="" />
                <div className="bili-carousel-cap">{slide.title}</div>
                <button type="button" className="bili-carousel-nav bili-carousel-prev" onClick={() => goCarousel(-1)} aria-label="上一张">
                  ‹
                </button>
                <button type="button" className="bili-carousel-nav bili-carousel-next" onClick={() => goCarousel(1)} aria-label="下一张">
                  ›
                </button>
                <div className="bili-carousel-dots" role="tablist">
                  {carouselSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={i === carouselIndex ? 'is-active' : ''}
                      onClick={() => setCarouselIndex(i)}
                      aria-label={`第 ${i + 1} 张`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {topSixVideos.length > 0 ? (
            <div className="bili-feed-top-six" aria-label="推荐视频">
              {topSixVideos.map((v) => (
                <FeedCard key={v.id} v={v} className="bili-vcard--top-six" />
              ))}
            </div>
          ) : null}

          <div className="bili-cards-wrap bili-cards-wrap--below">
            {belowVideos.map((v) => (
              <FeedCard key={v.id} v={v} />
            ))}
          </div>

          <div
            ref={feedSentinelRef}
            className={`bili-feed-sentinel${loadingMore ? ' is-loading' : ''}`}
            aria-live="polite"
          >
            {feedEnd ? '已加载全部演示数据' : loadingMore ? '正在加载更多…' : '下滑自动加载更多'}
          </div>
        </div>

        <p style={{ color: 'var(--bili-sub)', fontSize: 12, marginTop: 24, textAlign: 'center' }}>
          布局与交互为学习仿造 · 数据为演示随机生成 · 换一批 #{batch} · 已加载 {videos.length} 条
        </p>
      </main>

      <div className="bili-float">
        <button type="button" onClick={scrollTop} title="回顶部">
          ↑
        </button>
      </div>

      {toast ? (
        <div className="bili-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
