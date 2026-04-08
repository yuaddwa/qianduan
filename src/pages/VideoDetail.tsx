import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import { buildVideos, type VideoItem } from '../data/bilibiliMock'
import {
  addComment,
  addDanmaku,
  authorKey,
  ensureVideo,
  getComments,
  getDanmaku,
  getStats,
  giveCoin,
  isFollowingAuthor,
  pickSmartRelated,
  toggleFollowAuthor,
  toggleLike,
} from '../data/contentStore'
import { getUserVideoBlob } from '../data/videoBlobDb'
import { addHistory, isFavorite, toggleFavorite } from '../data/localState'
import { getRememberedVideo, rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
  id: string
}

const DEMO_MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4'

function formatCommentTime(at: number): string {
  const diff = Date.now() - at
  const sec = Math.floor(diff / 1000)
  if (sec < 45) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} 天前`
  return new Date(at).toLocaleDateString()
}

function fallbackFromId(id: string): VideoItem {
  const seed = Math.floor(Math.random() * 800)
  const list = buildVideos(seed)
  rememberVideos(list)
  return (
    list.find((v) => v.id === id) ?? {
      id,
      title: `视频 ${id}`,
      cover: `https://picsum.photos/seed/${encodeURIComponent(id)}/900/520`,
      plays: `${(Math.random() * 80 + 5).toFixed(1)}万`,
      comments: String(Math.floor(Math.random() * 2000 + 100)),
      duration: `${Math.floor(Math.random() * 15 + 1)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
      author: `UP主_${Math.floor(Math.random() * 900 + 100)}`,
      date: `${Math.floor(Math.random() * 6 + 1)}-前`,
      tag: Math.random() > 0.75 ? `${Math.floor(Math.random() * 9 + 1)}千点赞` : undefined,
      category: '推荐',
    }
  )
}

export default function VideoDetail({ session, onLogout, id }: Props) {
  const [, refresh] = useReducer((x: number) => x + 1, 0)
  const video = useMemo(() => {
    const v = getRememberedVideo(id) ?? fallbackFromId(id)
    ensureVideo(v)
    return v
  }, [id])

  const related = useMemo(() => pickSmartRelated(id, 8), [id])
  const fav = isFavorite(id)
  const [comment, setComment] = useState('')
  const [dm, setDm] = useState('')
  const [autoNext, setAutoNext] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [playErr, setPlayErr] = useState(false)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)

  const stats = getStats(id)
  const comments = getComments(id)
  const dms = getDanmaku(id)
  const followed = isFollowingAuthor(video.author)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }, [])

  useEffect(() => {
    addHistory(id)
    setPlayErr(false)
  }, [id])

  useEffect(() => {
    if (!video.hasLocalBlob) {
      setBlobSrc(null)
      return
    }
    let url: string | null = null
    let cancelled = false
    void (async () => {
      const blob = await getUserVideoBlob(id)
      if (cancelled || !blob) return
      url = URL.createObjectURL(blob)
      setBlobSrc(url)
    })()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, video.hasLocalBlob])

  const onShare = () => {
    const url = window.location.href
    void navigator.clipboard.writeText(url).then(
      () => showToast('链接已复制'),
      () => showToast('请手动复制地址栏链接'),
    )
  }

  const userName = session?.nickname || session?.username || '游客'

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
            <a
              href={`#/channel/${encodeURIComponent(video.category)}`}
              onClick={(e) => {
                e.preventDefault()
                navigateHash(`/channel/${encodeURIComponent(video.category)}`)
              }}
            >
              {video.category}
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
        <p className="donk-demo-hint">
          本地上传视频存 IndexedDB；推荐侧栏为智能排序（历史/收藏/点赞/关注）。接后端后可替换为真实 CDN 与算法接口。
        </p>

        <div className="bili-video-layout">
          <section className="bili-video-left">
            <div className="bili-detail-title">{video.title}</div>
            <div className="bili-detail-sub">
              <span>▶ {video.plays}</span>
              <span>💬 {video.comments}</span>
              <span>{video.date}</span>
              <span>{video.category}</span>
            </div>

            <div className="bili-player">
              {video.hasLocalBlob && !blobSrc && !playErr ? (
                <>
                  <img className="bili-player-img" src={video.cover} alt="" />
                  <div className="bili-player-mask">正在加载本机视频…</div>
                </>
              ) : playErr ? (
                <>
                  <img className="bili-player-img" src={video.cover} alt="" />
                  <div className="bili-player-mask">
                    {video.hasLocalBlob ? '无法播放本机文件，请重新上传或检查格式' : '演示：外链视频不可用，已用封面代替'}
                  </div>
                </>
              ) : (
                <video
                  key={blobSrc ?? 'demo'}
                  className="bili-player-video"
                  controls
                  playsInline
                  poster={video.cover}
                  src={video.hasLocalBlob ? blobSrc! : DEMO_MP4}
                  onError={() => setPlayErr(true)}
                >
                  <track kind="captions" />
                </video>
              )}
            </div>

            <div className="bili-dm-bar">
              <input
                value={dm}
                onChange={(e) => setDm(e.target.value)}
                placeholder="发个弹幕～"
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('dm-send')?.click()}
              />
              <button
                id="dm-send"
                type="button"
                className="bili-shuffle"
                onClick={() => {
                  const t = dm.trim()
                  if (!t) return
                  addDanmaku(id, t)
                  setDm('')
                  refresh()
                  showToast('弹幕已发送')
                }}
              >
                发送弹幕
              </button>
            </div>

            <div className="bili-action-bar">
              <button
                type="button"
                className={`bili-act-btn ${stats.userLiked ? 'is-on' : ''}`}
                onClick={() => {
                  toggleLike(id)
                  refresh()
                }}
              >
                👍 点赞 {stats.likes}
              </button>
              <button
                type="button"
                className={`bili-act-btn ${stats.userCoined ? 'is-on' : ''}`}
                onClick={() => {
                  const before = stats.userCoined
                  giveCoin(id)
                  refresh()
                  showToast(before ? '已投过币' : '投币 +1')
                }}
              >
                🪙 投币 {stats.coins}
              </button>
              <button
                type="button"
                className={`bili-act-btn ${fav ? 'is-on' : ''}`}
                onClick={() => {
                  const was = isFavorite(id)
                  toggleFavorite(id)
                  refresh()
                  showToast(was ? '已取消收藏' : '已加入收藏')
                }}
              >
                ⭐ 收藏
              </button>
              <button type="button" className="bili-act-btn" onClick={onShare}>
                🔗 分享
              </button>
              <button type="button" className="bili-act-btn" onClick={() => navigateHash(`/channel/${encodeURIComponent(video.category)}`)}>
                分区
              </button>
            </div>

            <div className="bili-video-toolbar">
              <button type="button" className="bili-shuffle" onClick={() => navigateHash('/home')}>
                回首页
              </button>
              <button
                type="button"
                className="bili-shuffle"
                onClick={() => (window.history.length > 1 ? window.history.back() : navigateHash('/home'))}
              >
                返回
              </button>
            </div>

            <div className="bili-comment-box">
              <div className="bili-comment-header">
                <div className="bili-comment-header-main">
                  <span className="bili-comment-title">全部评论</span>
                  <span className="bili-comment-count">{comments.length}</span>
                </div>
                <span className="bili-comment-sub">按时间排序</span>
              </div>
              <div className="bili-comment-body-wrap">
                <div className="bili-comment-composer">
                  <textarea
                    className="bili-comment-textarea"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="分享你的想法，友善交流～"
                    aria-label="评论输入"
                    rows={3}
                    maxLength={2000}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        document.getElementById('comment-send')?.click()
                      }
                    }}
                  />
                  <div className="bili-comment-composer-foot">
                    <span className="bili-comment-hint">Ctrl + Enter 快捷发布</span>
                    <button
                      id="comment-send"
                      type="button"
                      className="bili-comment-send"
                      onClick={() => {
                        const text = comment.trim()
                        if (!text) return
                        addComment(id, text, userName)
                        setComment('')
                        refresh()
                        showToast('评论已发布')
                      }}
                    >
                      发布评论
                    </button>
                  </div>
                </div>
                <div className="bili-comment-list">
                  {comments.length === 0 ? (
                    <div className="bili-comment-empty">
                      <div className="bili-comment-empty-icon" aria-hidden>
                        💬
                      </div>
                      <p className="bili-comment-empty-title">还没有评论</p>
                      <p className="bili-comment-empty-desc">来做第一个发言的人吧</p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bili-comment-item">
                        <div className="bili-comment-avatar" aria-hidden>
                          {c.user.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="bili-comment-main">
                          <div className="bili-comment-meta">
                            <span className="bili-comment-user">{c.user}</span>
                            <span className="bili-comment-time">{formatCommentTime(c.at)}</span>
                          </div>
                          <p className="bili-comment-content">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="bili-video-right">
            <div className="bili-up-card">
              <div className="bili-up-top">
                <div className="bili-up-avatar">{video.author.slice(0, 1)}</div>
                <div>
                  <div className="bili-up-name">{video.author}</div>
                  <div className="bili-up-sign">UP 主 · {authorKey(video.author)}</div>
                </div>
              </div>
              <button
                type="button"
                className="bili-btn-post"
                onClick={() => {
                  const now = toggleFollowAuthor(video.author)
                  refresh()
                  showToast(now ? '已关注' : '已取消关注')
                }}
              >
                {followed ? '已关注' : '+ 关注'}
              </button>
            </div>

            <div className="bili-right-card">
              <div className="bili-right-hd">
                <span>弹幕列表</span>
                <span>{dms.length} 条</span>
              </div>
              <div className="bili-dm-list">
                {dms.slice(-20).map((d) => (
                  <div key={d.id}>{d.text}</div>
                ))}
              </div>
            </div>

            <div className="bili-right-card">
              <div className="bili-right-hd">
                <span>接下来播放</span>
                <label className="bili-autonext">
                  自动连播
                  <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
                </label>
              </div>
              <div className="bili-next-list">
                {related.map((v) => (
                  <a
                    key={v.id}
                    className="bili-next-item"
                    href={`#/video/${encodeURIComponent(v.id)}`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigateHash(`/video/${encodeURIComponent(v.id)}`)
                    }}
                  >
                    <img src={v.cover} alt="" />
                    <div>
                      <div className="bili-next-title">{v.title}</div>
                      <div className="bili-next-sub">
                        <span>{v.author}</span>
                        <span>{v.duration}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {toast ? (
        <div className="bili-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
