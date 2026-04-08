import { useEffect, useMemo, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { buildVideos, type VideoItem } from '../data/bilibiliMock'
import { upsertVideos } from '../data/contentStore'
import { getHistory, clearHistory } from '../data/localState'
import { getRememberedVideo, rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
}

export default function History({ session, onLogout }: Props) {
  const [tick, setTick] = useState(0)
  const ids = useMemo(() => getHistory().map((x) => x.id), [tick])
  const fallback = useMemo<VideoItem[]>(() => buildVideos(300), [])

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
            <a className="is-active" href="#/history" onClick={(e) => e.preventDefault()}>
              历史
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
            <h2 className="bili-shelf-title">观看历史</h2>
            <p className="bili-shelf-desc">
              {items.length > 0
                ? `最近 ${items.length} 条 · 自动记录在本浏览器`
                : '看过的视频会按时间出现在这里'}
            </p>
          </div>
          <div className="bili-shelf-head-actions">
            <button
              type="button"
              className="bili-shelf-btn bili-shelf-btn--ghost"
              disabled={items.length === 0}
              onClick={() => {
                clearHistory()
                setTick((x) => x + 1)
              }}
            >
              清空记录
            </button>
            <button type="button" className="bili-shelf-btn bili-shelf-btn--ghost" onClick={() => navigateHash('/home')}>
              回首页
            </button>
          </div>
        </header>

        {items.length ? (
          <ul className="bili-shelf-list">
            {items.map((v) => (
              <li key={v.id} className="bili-shelf-item bili-shelf-item--history">
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
              </li>
            ))}
          </ul>
        ) : (
          <div className="bili-shelf-empty">
            <div className="bili-shelf-empty-icon" aria-hidden>
              🕐
            </div>
            <h3 className="bili-shelf-empty-title">暂无观看记录</h3>
            <p className="bili-shelf-empty-text">在首页打开任意视频，会自动加入历史。</p>
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
