import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolvePublicUrl, type Session } from '../auth/auth'
import {
  addPublished,
  addUserUploadedVideo,
  getNotifications,
  markAllNotificationsRead,
  mergeFeedWithUploads,
} from '../data/contentStore'
import {
  addCommunityPost,
  getCommunityPosts,
  getPostDraft,
  setPostDraft,
  type CommunityPost,
} from '../data/localState'
import { buildVideos, type VideoItem, utilityTiles, videoCategoryPool } from '../data/bilibiliMock'
import { extractVideoMeta } from '../data/videoUploadUtils'
import { rememberVideos } from '../data/videoCache'
import { navigateHash } from '../hooks/useHashRoute'
import './home.css'

type Props = {
  session: Session | null
  onLogout: () => void
  name: string
}

const LIVE_ROOMS = [
  { id: '1', title: '深夜写代码 · 一起肝项目', hot: '1.2万' },
  { id: '2', title: '前端面试答疑', hot: '8.3千' },
  { id: '3', title: '独立游戏试玩', hot: '2.1万' },
]

const LESSONS = [
  { t: 'TypeScript 入门 8 讲', m: '35 分钟' },
  { t: 'Vite + React 部署实践', m: '22 分钟' },
  { t: 'Nginx 子路径与 SPA', m: '18 分钟' },
]

const GAMES = ['像素地牢', '节奏方块', '解谜小屋', '联机棋牌']

const UPLOAD_MAX_BYTES = 200 * 1024 * 1024

function uploadAuthorLabel(s: Session | null) {
  if (!s) return '访客'
  const u = (s.username || '').trim()
  if (u && !u.includes('@')) return u
  const em = (s.email || '').trim()
  if (em.includes('@')) return em.split('@')[0] || '我'
  const nick = (s.nickname || '').trim()
  return nick || '我'
}

export default function Utility({ session, onLogout, name }: Props) {
  const tile = useMemo(() => utilityTiles.find((t) => t.label === name), [name])
  const baseSeed = useMemo(() => Math.floor(Math.random() * 700), [])
  const [feedRev, setFeedRev] = useState(0)
  const videos = useMemo(
    () => mergeFeedWithUploads(buildVideos(baseSeed)),
    [baseSeed, feedRev],
  )
  const [toast, setToast] = useState<string | null>(null)
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [community, setCommunity] = useState<CommunityPost[]>(() => getCommunityPosts())
  const [newThread, setNewThread] = useState('')
  const [, setUtilTick] = useState(0)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState(() => videoCategoryPool[0] ?? '知识')
  const [uploadBusy, setUploadBusy] = useState(false)

  useEffect(() => {
    const onContent = () => setFeedRev((x) => x + 1)
    window.addEventListener('donk666-content', onContent)
    return () => window.removeEventListener('donk666-content', onContent)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }, [])

  useMemo(() => {
    rememberVideos(videos)
    return null
  }, [videos])

  useEffect(() => {
    const d = getPostDraft()
    if (d) {
      setPostTitle(d.title)
      setPostBody(d.body)
    }
  }, [name])

  const saveDraft = () => {
    setPostDraft({ title: postTitle.trim(), body: postBody.trim(), updatedAt: Date.now() })
    showToast('草稿已保存到本机')
  }

  const publishFake = () => {
    if (!postTitle.trim()) {
      showToast('请填写标题')
      return
    }
    saveDraft()
    addPublished(postTitle.trim(), postBody.trim())
    showToast('已写入「我的投稿」与个人消息（本机）')
  }

  const submitCommunity = () => {
    const next = addCommunityPost(newThread)
    setCommunity(next)
    setNewThread('')
    showToast('已发帖（仅存本机）')
  }

  const extraPanel = () => {
    if (name === '上传视频') {
      return (
        <div className="donk-util-form">
          <div className="donk-util-form-title">上传视频（本机 IndexedDB）</div>
          <p className="donk-util-hint">
            视频文件保存在当前浏览器，不会传到服务器；建议单文件小于 200MB。封面与时长会在本地自动截取。
          </p>
          <label className="donk-util-label">
            选择文件
            <input
              type="file"
              accept="video/*"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null
                setUploadFile(f)
                if (!f) {
                  setUploadTitle('')
                  return
                }
                if (f.size > UPLOAD_MAX_BYTES) {
                  showToast('文件过大，请选择小于 200MB 的视频')
                  setUploadFile(null)
                  e.target.value = ''
                  return
                }
                const base = f.name.replace(/\.[^.]+$/, '') || '我的视频'
                setUploadTitle(base)
              }}
            />
          </label>
          {uploadFile ? (
            <div className="donk-util-hint" style={{ marginTop: -4 }}>
              已选：{uploadFile.name}（{(uploadFile.size / (1024 * 1024)).toFixed(1)} MB）
            </div>
          ) : null}
          <label className="donk-util-label">
            标题
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="视频标题"
              disabled={uploadBusy}
            />
          </label>
          <label className="donk-util-label">
            分区
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} disabled={uploadBusy}>
              {videoCategoryPool.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="donk-util-form-actions">
            <button
              type="button"
              className="bili-btn-post"
              disabled={uploadBusy || !uploadFile}
              onClick={async () => {
                if (!uploadFile || uploadBusy) return
                if (uploadFile.size > UPLOAD_MAX_BYTES) {
                  showToast('文件过大')
                  return
                }
                if (!uploadTitle.trim()) {
                  showToast('请填写标题')
                  return
                }
                setUploadBusy(true)
                try {
                  const meta = await extractVideoMeta(uploadFile)
                  const item = await addUserUploadedVideo({
                    file: uploadFile,
                    title: uploadTitle.trim(),
                    category: uploadCategory,
                    author: uploadAuthorLabel(session),
                    cover: meta.cover,
                    duration: meta.duration,
                  })
                  rememberVideos(mergeFeedWithUploads(buildVideos(baseSeed)))
                  showToast('已保存，可在首页与播放页观看')
                  setUploadFile(null)
                  setUploadTitle('')
                  navigateHash(`/video/${encodeURIComponent(item.id)}`)
                } catch {
                  showToast('处理失败，请换格式或缩短时长再试')
                } finally {
                  setUploadBusy(false)
                }
              }}
            >
              {uploadBusy ? '处理中…' : '上传并入库'}
            </button>
          </div>
        </div>
      )
    }
    if (name === '投稿') {
      return (
        <div className="donk-util-form">
          <div className="donk-util-form-title">新建投稿（草稿存浏览器）</div>
          <label className="donk-util-label">
            标题
            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="给你的作品起个名字" />
          </label>
          <label className="donk-util-label">
            简介
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} placeholder="简介、分区说明等" rows={4} />
          </label>
          <div className="donk-util-form-actions">
            <button type="button" className="bili-shuffle" onClick={saveDraft}>
              保存草稿
            </button>
            <button type="button" className="bili-btn-post" onClick={publishFake}>
              提交（演示）
            </button>
          </div>
        </div>
      )
    }
    if (name === '社区') {
      return (
        <div className="donk-util-form">
          <div className="donk-util-form-title">社区帖子（仅存本机，最多 50 条）</div>
          <div className="donk-util-thread-input">
            <textarea value={newThread} onChange={(e) => setNewThread(e.target.value)} placeholder="说点什么…" rows={3} />
            <button type="button" className="bili-btn-post" onClick={submitCommunity}>
              发布
            </button>
          </div>
          <div className="donk-util-thread-list">
            {community.length === 0 ? (
              <div className="bili-empty" style={{ marginTop: 8 }}>
                还没有帖子，做第一个发言的人吧。
              </div>
            ) : (
              community.map((p) => (
                <div key={p.id} className="donk-util-thread-item">
                  <div className="donk-util-thread-meta">{new Date(p.at).toLocaleString()}</div>
                  <div>{p.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }
    if (name === '直播') {
      return (
        <div className="donk-util-grid-cards">
          {LIVE_ROOMS.map((r) => (
            <div key={r.id} className="donk-util-mini-card">
              <div className="donk-util-mini-title">{r.title}</div>
              <div className="donk-util-mini-sub">热度 {r.hot}</div>
              <button type="button" className="bili-shuffle" onClick={() => showToast('播放器接流地址后在此打开')}>
                进入房间
              </button>
            </div>
          ))}
        </div>
      )
    }
    if (name === '课堂') {
      return (
        <div className="donk-util-lessons">
          {LESSONS.map((l) => (
            <div key={l.t} className="donk-util-lesson-row">
              <span>{l.t}</span>
              <span className="donk-util-lesson-meta">{l.m}</span>
              <button type="button" className="bili-shuffle" onClick={() => showToast('课时视频 URL 由后端下发')}>
                学习
              </button>
            </div>
          ))}
        </div>
      )
    }
    if (name === '游戏') {
      return (
        <div className="donk-util-game-grid">
          {GAMES.map((g) => (
            <button key={g} type="button" className="donk-util-game-tile" onClick={() => showToast(`「${g}」需接游戏壳或 H5 地址`)}>
              {g}
            </button>
          ))}
        </div>
      )
    }
    if (name === '活动') {
      return (
        <ul className="donk-util-checklist">
          <li>
            <input type="checkbox" readOnly checked /> 春节征稿 · 已结束（示例）
          </li>
          <li>
            <input type="checkbox" readOnly /> 创作者激励 · 报名中（示例）
          </li>
          <li>
            <input type="checkbox" readOnly /> 技术征文 · 即将开始（示例）
          </li>
        </ul>
      )
    }
    if (name === '消息') {
      const notes = getNotifications()
      return (
        <div className="donk-util-form">
          <div className="donk-util-form-title">最近通知</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" className="bili-btn-post" onClick={() => navigateHash('/inbox')}>
              打开消息中心
            </button>
            <button
              type="button"
              className="bili-shuffle"
              onClick={() => {
                markAllNotificationsRead()
                setUtilTick((x) => x + 1)
                showToast('已全部标为已读')
              }}
            >
              全部已读
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="bili-empty">暂无通知</div>
          ) : (
            <div className="donk-util-thread-list">
              {notes.slice(0, 8).map((n) => (
                <div key={n.id} className="donk-util-thread-item" style={{ opacity: n.read ? 0.7 : 1 }}>
                  <div className="donk-util-thread-meta">{new Date(n.at).toLocaleString()}</div>
                  <div>{n.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    if (name === '专栏') {
      return (
        <div className="donk-util-form">
          <div className="donk-util-form-title">专栏长文（与投稿共用本地草稿逻辑）</div>
          <p className="donk-util-hint">可先写正文，再点保存；与「投稿」页共享同一份草稿存储键，便于你二选一入口。</p>
          <label className="donk-util-label">
            标题
            <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
          </label>
          <label className="donk-util-label">
            正文
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={8} />
          </label>
          <button type="button" className="bili-btn-post" onClick={saveDraft}>
            保存到本机
          </button>
        </div>
      )
    }
    return null
  }

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
            <a className="is-active" href={`#/util/${encodeURIComponent(name)}`} onClick={(e) => e.preventDefault()}>
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
          <h2 className="bili-feed-title">
            {tile?.icon ? <span aria-hidden style={{ marginRight: 8 }}>{tile.icon}</span> : null}
            {name}
          </h2>
          <button type="button" className="bili-shuffle" onClick={() => navigateHash('/home')}>
            ← 返回首页
          </button>
        </div>

        <p className="donk-demo-hint">
          以下为可交互演示：带「仅存本机」的功能已写入浏览器；列表类内容接 API 后可替换为真实数据。
        </p>

        <div className="bili-util-panel">
          <div className="bili-util-card">
            <div className="bili-util-card-title">本页能力</div>
            <div className="bili-util-card-sub">
              {name === '投稿' && '填写标题与简介，草稿写入 localStorage。'}
              {name === '社区' && '发帖、浏览帖子，数据仅存本机。'}
              {name === '直播' && '房间卡片与进入按钮（播放需推流地址）。'}
              {name === '课堂' && '课时列表与「学习」占位。'}
              {name === '游戏' && '入口宫格，点击给出接入提示。'}
              {name === '活动' && '活动列表示例。'}
              {name === '专栏' && '长文编辑与本地保存。'}
              {name === '消息' && '站内通知示例（可接 WebSocket / 轮询接口）。'}
              {name === '上传视频' && '选择本地视频写入 IndexedDB，并进入推荐与猜你喜欢排序。'}
              {!['投稿', '社区', '直播', '课堂', '游戏', '活动', '专栏', '消息', '上传视频'].includes(name) &&
                `「${name}」页：下方仍为推荐视频流，可点进详情。`}
            </div>
          </div>
          <div className="bili-util-card">
            <div className="bili-util-card-title">接后端时</div>
            <div className="bili-util-card-sub">
              把本页的读取/提交改为 REST 或 GraphQL；鉴权走现有 JWT；静态资源继续走 Nginx 或 OSS。
            </div>
          </div>
        </div>

        {extraPanel()}

        <div className="bili-feed-head" style={{ marginTop: 16 }}>
          <h3 className="bili-feed-title" style={{ fontSize: 16 }}>
            推荐视频（演示）
          </h3>
        </div>

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
      </main>

      {toast ? (
        <div className="bili-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
