import { useEffect, useMemo, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { upsertVideos } from '../data/contentStore'
import { buildVideos, type VideoItem } from '../data/bilibiliMock'
import { rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
  q: string
}

export default function Search({ session, onLogout, q }: Props) {
  const [search, setSearch] = useState(q)
  const [videos] = useState<VideoItem[]>(() => buildVideos(Math.floor(Math.random() * 900)))

  useEffect(() => {
    rememberVideos(videos)
    upsertVideos(videos)
  }, [videos])

  const list = useMemo(() => {
    const kw = (q || '').trim()
    if (!kw) return []
    return videos.filter((v) => v.title.includes(kw) || v.author.includes(kw) || v.category.includes(kw))
  }, [videos, q])

  return (
    <div className="bili-page">
      <div className="bili-nav-wrap">
        <nav className="bili-nav">
          <a className="bili-logo" href="#/home">
            donk<span>666</span>
          </a>
          <div className="bili-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && navigateHash(`/search/${encodeURIComponent(search.trim())}`)}
              placeholder="输入关键词搜索"
              aria-label="搜索"
            />
            <button type="button" onClick={() => navigateHash(`/search/${encodeURIComponent(search.trim())}`)} aria-label="搜索">
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
                <button type="button" className="bili-shuffle" title="退出" onClick={() => void onLogout()}>
                  退出
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
          </div>
        </nav>
      </div>

      <main className="bili-main">
        <div className="bili-feed-head">
          <h2 className="bili-feed-title">搜索结果</h2>
          <button type="button" className="bili-shuffle" onClick={() => navigateHash('/home')}>
            ← 回首页
          </button>
        </div>

        <p style={{ color: 'var(--bili-sub)', margin: '0 0 12px' }}>
          搜索「{q}」 · 共 {list.length} 条
        </p>

        {list.length ? (
          <div className="bili-cards-wrap" style={{ gridColumn: '1 / -1' }}>
            {list.map((v) => (
              <a
                key={v.id}
                className="bili-vcard"
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
            ))}
          </div>
        ) : (
          <div className="bili-empty">没有找到结果，换个关键词试试。</div>
        )}
      </main>
    </div>
  )
}

