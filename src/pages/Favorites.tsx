import { useEffect, useMemo, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { buildVideos, type VideoItem } from '../data/bilibiliMock'
import { upsertVideos } from '../data/contentStore'
import { getFavorites, toggleFavorite } from '../data/localState'
import { getRememberedVideo, rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
}

export default function Favorites({ session, onLogout }: Props) {
  const [tick, setTick] = useState(0)
  const ids = useMemo(() => getFavorites(), [tick])
  const fallback = useMemo<VideoItem[]>(() => buildVideos(520), [])

  useMemo(() => {
    rememberVideos(fallback)
    return null
  }, [fallback])

  const items = useMemo(() => {
    return ids
      .map((id) => getRememberedVideo(id) ?? fallbackFromId(id, fallback))
      .filter(Boolean) as VideoItem[]
  }, [ids, fallback])

  useEffect(() => {
    if (items.length) upsertVideos(items)
  }, [items])

  return (
    <div className="bili-page">
      <div className="bili-nav-wrap">
        <nav className="bili-nav">
          <a className="bili-logo" href="#/home">
            donk<span>666</span>
          </a>
          <div className="bili-nav-links">
            <a
              href="#/home"
              onClick={(e) => {
                e.preventDefault()
                navigateHash('/home')
              }}
            >
              首页
            </a>
            <a className="is-active" href="#/favorites" onClick={(e) => e.preventDefault()}>
              收藏
            </a>
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

      <main className="bili-main bili-main--shelf">
        <header className="bili-shelf-head">
          <div className="bili-shelf-head-text">
            <h2 className="bili-shelf-title">我的收藏</h2>
            <p className="bili-shelf-desc">
              {items.length > 0
                ? `共 ${items.length} 个视频 · 数据仅保存在本浏览器`
                : '收藏你喜欢的视频，方便下次继续观看'}
            </p>
          </div>
          <div className="bili-shelf-head-actions">
            <button type="button" className="bili-shelf-btn bili-shelf-btn--ghost" onClick={() => navigateHash('/home')}>
              回首页
            </button>
          </div>
        </header>

        {items.length ? (
          <ul className="bili-shelf-list">
            {items.map((v) => (
              <li key={v.id} className="bili-shelf-item">
                <a
                  className="bili-shelf-link"
                  href={`#/video/${encodeURIComponent(v.id)}`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigateHash(`/video/${encodeURIComponent(v.id)}`)
                  }}
                >
                  <div className="bili-shelf-thumb">
                    <img src={v.cover} alt="" loading="lazy" />
                    <span className="bili-shelf-duration">{v.duration}</span>
                  </div>
                  <div className="bili-shelf-body">
                    {v.tag ? <span className="bili-shelf-tag">{v.tag}</span> : null}
                    <h3 className="bili-shelf-vtitle">{v.title}</h3>
                    <div className="bili-shelf-meta">
                      <span className="bili-shelf-author">{v.author}</span>
                      <span className="bili-shelf-sep" aria-hidden>
                        ·
                      </span>
                      <span>{v.date}</span>
                      {v.category ? (
                        <>
                          <span className="bili-shelf-sep" aria-hidden>
                            ·
                          </span>
                          <span>{v.category}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="bili-shelf-stats">
                      <span>播放 {v.plays}</span>
                      <span>评论 {v.comments}</span>
                    </div>
                  </div>
                </a>
                <button
                  type="button"
                  className="bili-shelf-unfav"
                  aria-label={`取消收藏 ${v.title}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleFavorite(v.id)
                    setTick((x) => x + 1)
                  }}
                >
                  取消收藏
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bili-shelf-empty">
            <div className="bili-shelf-empty-icon" aria-hidden>
              ⭐
            </div>
            <h3 className="bili-shelf-empty-title">还没有收藏</h3>
            <p className="bili-shelf-empty-text">在视频详情页点击「收藏」，会出现在这里。</p>
            <button type="button" className="bili-shelf-btn bili-shelf-btn--primary" onClick={() => navigateHash('/home')}>
              去首页逛逛
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

function fallbackFromId(id: string, list: VideoItem[]) {
  return list.find((v) => v.id === id)
}
