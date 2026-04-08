import { useMemo, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { getNotifications, markAllNotificationsRead } from '../data/contentStore'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
}

export default function Inbox({ session, onLogout }: Props) {
  const [tick, setTick] = useState(0)
  const list = useMemo(() => getNotifications(), [tick])

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
            <a className="is-active" href="#/inbox" onClick={(e) => e.preventDefault()}>
              消息
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
          <h2 className="bili-feed-title">消息中心</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="bili-shuffle"
              onClick={() => {
                markAllNotificationsRead()
                setTick((x) => x + 1)
              }}
            >
              全部已读
            </button>
            <button type="button" className="bili-shuffle" onClick={() => navigateHash('/home')}>
              ← 回首页
            </button>
          </div>
        </div>

        <p className="donk-demo-hint">通知数据保存在本机；接入后端后可改为接口轮询或 WebSocket。</p>

        {list.length === 0 ? (
          <div className="bili-empty">暂无消息。投稿成功或系统事件会出现在这里。</div>
        ) : (
          <div className="donk-util-thread-list">
            {list.map((n) => (
              <div
                key={n.id}
                className="donk-util-thread-item"
                style={{ opacity: n.read ? 0.65 : 1, fontWeight: n.read ? 400 : 600 }}
              >
                <div className="donk-util-thread-meta">{new Date(n.at).toLocaleString()}</div>
                <div>{n.text}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
