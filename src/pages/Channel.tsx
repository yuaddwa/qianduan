import { useEffect, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { upsertVideos } from '../data/contentStore'
import { buildVideosForChannel, type VideoItem } from '../data/bilibiliMock'
import { rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
  name: string
}

export default function Channel({ session, onLogout, name }: Props) {
  const [videos] = useState<VideoItem[]>(() => buildVideosForChannel(name))

  useEffect(() => {
    rememberVideos(videos)
    upsertVideos(videos)
  }, [videos])

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
            <a className="is-active" href={`#/channel/${encodeURIComponent(name)}`} onClick={(e) => e.preventDefault()}>
              {name}
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

      <main className="bili-main">
        <div className="bili-feed-head">
          <h2 className="bili-feed-title">{name}</h2>
          <button type="button" className="bili-shuffle" onClick={() => navigateHash('/home')}>
            ← 返回首页
          </button>
        </div>

        <p className="donk-demo-hint">
          内容区为前端演示数据；接入后端后此处改为真实接口分页加载。
        </p>

        {videos.length ? (
          <div className="bili-cards-wrap" style={{ gridColumn: '1 / -1' }}>
            {videos.map((v) => (
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
          <div className="bili-empty">暂无条目（异常情况）。</div>
        )}
      </main>
    </div>
  )
}

