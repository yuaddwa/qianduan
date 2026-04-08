import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { Session, UserProfile } from '../auth/auth'
import {
  changePassword,
  fetchCurrentUser,
  fetchMyAvatarUrl,
  resolvePublicUrl,
  uploadAvatar,
} from '../auth/auth'
import {
  ensureSeedFeed,
  getFavoriteVideosForList,
  getLikedVideoItems,
  getPublished,
  getSpaceHeaderStats,
  getUserUploads,
  unreadNotificationCount,
} from '../data/contentStore'
import { navigateHash } from '../hooks/useHashRoute'

type Props = {
  session: Session
  onLogout: () => void
}

const SIG_KEY = 'donk666.profile.signature.v1'

function profileDisplayName(s: Session, p: UserProfile | null) {
  const nick = (p?.nickname || s.nickname)?.trim()
  if (nick) return nick
  const u = (s.username || '').trim()
  if (u && !u.includes('@')) return u
  const em = (p?.email || s.email || '').trim()
  if (em.includes('@')) return em.split('@')[0] || u || '用户'
  return u || '用户'
}

function spaceAuthorKey(s: Session): string {
  const u = (s.username || '').trim()
  if (u && !u.includes('@')) return u
  const em = (s.email || '').trim()
  if (em.includes('@')) return em.split('@')[0] || '我'
  return (s.nickname || '').trim() || '我'
}

function readSignature(): string {
  try {
    return localStorage.getItem(SIG_KEY) || ''
  } catch {
    return ''
  }
}

function writeSignature(t: string) {
  try {
    localStorage.setItem(SIG_KEY, t)
  } catch {
    /* ignore */
  }
}

type MainTab = 'home' | 'submit' | 'fav' | 'settings'

export default function Profile({ session, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [uploadTick, setUploadTick] = useState(0)
  const [mainTab, setMainTab] = useState<MainTab>('home')
  const [searchQ, setSearchQ] = useState('')
  const [signature, setSignature] = useState(readSignature)
  const [sigDraft, setSigDraft] = useState(readSignature)
  const [sigEditing, setSigEditing] = useState(false)

  const submitRef = useRef<HTMLDivElement>(null)
  const favRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onContent = () => setUploadTick((t) => t + 1)
    window.addEventListener('donk666-content', onContent)
    return () => window.removeEventListener('donk666-content', onContent)
  }, [])

  useEffect(() => {
    ensureSeedFeed()
  }, [])

  const myVideos = useMemo(() => {
    void uploadTick
    return [...getUserUploads()].sort((a, b) => b.id.localeCompare(a.id))
  }, [uploadTick])

  const favVideos = useMemo(() => {
    void uploadTick
    return getFavoriteVideosForList(48)
  }, [uploadTick])

  const likedVideos = useMemo(() => {
    void uploadTick
    return getLikedVideoItems(10)
  }, [uploadTick])

  useEffect(() => {
    let mounted = true
    void (async () => {
      const res = await fetchCurrentUser()
      if (!mounted) return
      if (res.ok && res.data) setProfile(res.data)
      const avatarRes = await fetchMyAvatarUrl()
      if (!mounted) return
      if (avatarRes.ok) setAvatarUrl(avatarRes.avatarUrl)
    })()
    return () => {
      mounted = false
    }
  }, [])

  const resolvedAvatar = useMemo(
    () => resolvePublicUrl(avatarUrl || profile?.avatarUrl),
    [avatarUrl, profile?.avatarUrl],
  )

  useEffect(() => {
    setAvatarBroken(false)
  }, [resolvedAvatar])

  const displayName = profileDisplayName(session, profile)
  const authorKey = spaceAuthorKey(session)
  const spaceStats = useMemo(() => getSpaceHeaderStats(authorKey), [authorKey, uploadTick])
  const msgUnread = useMemo(() => unreadNotificationCount(), [uploadTick])

  const initial = (session.username || session.email || '?').slice(0, 1).toUpperCase()
  const showImg = Boolean(resolvedAvatar) && !avatarBroken

  const pinned = myVideos[0] ?? favVideos[0] ?? null
  const uidDemo = useMemo(() => {
    let h = 0
    const em = profile?.email || session.email || session.username
    for (let i = 0; i < em.length; i++) h = (h * 31 + em.charCodeAt(i)) >>> 0
    return 10000000 + (h % 80000000)
  }, [profile?.email, session.email, session.username])

  const goTab = (t: MainTab) => {
    setMainTab(t)
    if (t === 'submit') submitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (t === 'fav') favRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const doSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQ.trim()
    if (q) navigateHash(`/search/${encodeURIComponent(q)}`)
  }

  const saveSig = () => {
    const t = sigDraft.trim()
    setSignature(t)
    writeSignature(t)
    setSigEditing(false)
  }

  const showHomeBlocks = mainTab === 'home'
  const showSubmitOnly = mainTab === 'submit'
  const showFavOnly = mainTab === 'fav'
  const showSettings = mainTab === 'settings'

  const block = (cond: boolean) => (cond ? undefined : { display: 'none' as const })

  return (
    <div className="donk-space">
      <header className="donk-space-topnav">
        <div className="donk-space-topnav-inner">
          <div className="donk-space-topnav-left">
            <a className="donk-space-logo" href="#/home">
              donk<span>666</span>
            </a>
            <nav className="donk-space-topnav-links">
              <a href="#/home">首页</a>
              <a href="#/channel/知识">番剧</a>
              <a href="#/util/直播">直播</a>
              <a href="#/util/游戏">游戏</a>
              <a href="#/util/专栏">专栏</a>
            </nav>
          </div>
          <form className="donk-space-search" onSubmit={doSearch}>
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="搜索视频、UP 主…"
              aria-label="搜索"
            />
            <button type="submit" aria-label="搜索">
              🔍
            </button>
          </form>
          <div className="donk-space-topnav-right">
            <a className="donk-space-iconlink" href="#/inbox" title="消息">
              💬
              {msgUnread > 0 ? <span className="donk-space-badge">{msgUnread > 99 ? '99+' : msgUnread}</span> : null}
            </a>
            <a className="donk-space-iconlink" href="#/favorites" title="收藏">
              ⭐
            </a>
            <a className="donk-space-iconlink" href="#/history" title="历史">
              🕐
            </a>
            <a className="donk-space-avatar-mini" href="#/profile" title="空间">
              {showImg ? <img src={resolvedAvatar} alt="" /> : <span>{initial}</span>}
            </a>
            <a className="donk-space-btn-upload" href="#/util/上传视频">
              <span aria-hidden>⬆</span>
              投稿
            </a>
          </div>
        </div>
      </header>

      <div className="donk-space-wrap">
        <section className="donk-space-banner">
          <div className="donk-space-banner-bg" aria-hidden />
          <div className="donk-space-banner-bar">
            <div className="donk-space-banner-user">
              <div className="donk-space-avatar-lg">
                {showImg ? (
                  <img src={resolvedAvatar} alt="" onError={() => setAvatarBroken(true)} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="donk-space-banner-text">
                <div className="donk-space-name-row">
                  <h1 className="donk-space-name">{displayName}</h1>
                  <span className="donk-space-lv">LV2</span>
                  <span className="donk-space-vip">大会员</span>
                </div>
                {sigEditing ? (
                  <div className="donk-space-sig-edit">
                    <input
                      className="donk-space-sig-input"
                      value={sigDraft}
                      onChange={(e) => setSigDraft(e.target.value)}
                      placeholder="写一句个性签名…"
                      maxLength={80}
                    />
                    <button type="button" className="donk-space-sig-btn" onClick={saveSig}>
                      保存
                    </button>
                    <button
                      type="button"
                      className="donk-space-sig-btn donk-space-sig-btn--ghost"
                      onClick={() => {
                        setSigDraft(signature)
                        setSigEditing(false)
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button type="button" className="donk-space-sig-link" onClick={() => setSigEditing(true)}>
                    {signature ? signature : '编辑个性签名'}
                  </button>
                )}
              </div>
            </div>
            <div className="donk-space-banner-tools">
              <span className="donk-space-view-as">视角：自己</span>
            </div>
          </div>
        </section>

        <div className="donk-space-tabs-wrap">
          <nav className="donk-space-tabs" aria-label="空间导航">
            <button
              type="button"
              className={mainTab === 'home' ? 'is-active' : ''}
              onClick={() => setMainTab('home')}
            >
              主页
            </button>
            <a href="#/home">动态</a>
            <button
              type="button"
              className={mainTab === 'submit' ? 'is-active' : ''}
              onClick={() => goTab('submit')}
            >
              投稿
            </button>
            <button
              type="button"
              className={mainTab === 'fav' ? 'is-active' : ''}
              onClick={() => goTab('fav')}
            >
              收藏
            </button>
            <a href="#/favorites">追番追剧</a>
            <button
              type="button"
              className={mainTab === 'settings' ? 'is-active' : ''}
              onClick={() => setMainTab('settings')}
            >
              设置
            </button>
          </nav>
          <div className="donk-space-stats">
            <div>
              <span className="donk-space-stat-n">{spaceStats.following}</span>
              <span className="donk-space-stat-l">关注</span>
            </div>
            <div>
              <span className="donk-space-stat-n">{spaceStats.fans}</span>
              <span className="donk-space-stat-l">粉丝</span>
            </div>
            <div>
              <span className="donk-space-stat-n">{spaceStats.likesOnUploads}</span>
              <span className="donk-space-stat-l">获赞</span>
            </div>
            <div>
              <span className="donk-space-stat-n">{spaceStats.uploads}</span>
              <span className="donk-space-stat-l">稿件</span>
            </div>
          </div>
        </div>

        <div className="donk-space-body">
          <div className="donk-space-main">
            {!showSettings ? (
              <>
                <div className="donk-space-perspective" style={block(!showHomeBlocks)}>
                  <button type="button" className="is-on">
                    粉丝视角
                  </button>
                  <button type="button" className="is-off">
                    新访客视角
                  </button>
                </div>

                <section className="donk-space-card" style={block(!showHomeBlocks)}>
                  <div className="donk-space-card-hd">
                    <h2>置顶视频</h2>
                  </div>
                  {pinned ? (
                    <a className="donk-space-pin" href={`#/video/${encodeURIComponent(pinned.id)}`}>
                      <div className="donk-space-pin-thumb">
                        <img src={pinned.cover} alt="" />
                        {pinned.isUserUpload ? <span className="donk-space-pin-badge">上传</span> : null}
                      </div>
                      <div className="donk-space-pin-body">
                        <div className="donk-space-pin-title">{pinned.title}</div>
                        <div className="donk-space-pin-meta">
                          {pinned.plays} 播放 · {pinned.duration}
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="donk-space-pin-empty">
                      <p>还没有置顶视频</p>
                      <a className="donk-space-btn-blue" href="#/util/上传视频">
                        + 上传视频
                      </a>
                    </div>
                  )}
                </section>

                <section
                  className="donk-space-card"
                  id="space-fav"
                  ref={favRef}
                  style={block(!(showHomeBlocks || showFavOnly))}
                >
                  <div className="donk-space-card-hd">
                    <h2>收藏夹</h2>
                    <a className="donk-space-more" href="#/favorites">
                      查看更多
                    </a>
                  </div>
                  {favVideos.length === 0 ? (
                    <div className="donk-space-fav-empty">
                      <p>默认收藏夹还是空的</p>
                      <a className="donk-space-btn-blue" href="#/home">
                        去发现好视频
                      </a>
                    </div>
                  ) : (
                    <a className="donk-space-fav-folder" href="#/favorites">
                      <div className="donk-space-fav-cover">
                        <img src={favVideos[0]?.cover} alt="" />
                      </div>
                      <div className="donk-space-fav-info">
                        <div className="donk-space-fav-name">默认收藏夹</div>
                        <div className="donk-space-fav-sub">公开 · {favVideos.length} 个内容</div>
                      </div>
                    </a>
                  )}
                </section>

                <section className="donk-space-card" style={block(!showHomeBlocks)}>
                  <div className="donk-space-card-hd">
                    <h2>最近点赞的视频</h2>
                  </div>
                  {likedVideos.length === 0 ? (
                    <p className="donk-space-muted">去播放页点个赞，会出现在这里。</p>
                  ) : (
                    <div className="donk-space-hscroll">
                      {likedVideos.map((v) => (
                        <a key={v.id} className="donk-space-mini-v" href={`#/video/${encodeURIComponent(v.id)}`}>
                          <div className="donk-space-mini-thumb">
                            <img src={v.cover} alt="" />
                          </div>
                          <div className="donk-space-mini-title">{v.title}</div>
                          <div className="donk-space-mini-meta">{v.plays}</div>
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  className="donk-space-card"
                  id="space-works"
                  ref={submitRef}
                  style={block(!(showHomeBlocks || showSubmitOnly))}
                >
                  <div className="donk-space-card-hd">
                    <h2>投稿与上传</h2>
                    <div className="donk-space-card-actions">
                      <a className="donk-space-btn-blue-outline" href="#/util/投稿">
                        文字投稿
                      </a>
                      <a className="donk-space-btn-blue" href="#/util/上传视频">
                        视频投稿
                      </a>
                    </div>
                  </div>
                  <p className="donk-space-muted">
                    视频文件存于本机 IndexedDB；文字投稿存 localStorage。接后端后可替换为真实稿件列表。
                  </p>
                  <h3 className="donk-space-subh">本地上传</h3>
                  {myVideos.length === 0 ? (
                    <div className="donk-space-fav-empty">
                      <p>暂无上传</p>
                      <a className="donk-space-btn-blue" href="#/util/上传视频">
                        去上传
                      </a>
                    </div>
                  ) : (
                    <ul className="donk-space-work-list">
                      {myVideos.map((v) => (
                        <li key={v.id}>
                          <a href={`#/video/${encodeURIComponent(v.id)}`}>{v.title}</a>
                          <span>
                            {v.category} · {v.duration}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <h3 className="donk-space-subh">我的投稿（本机草稿）</h3>
                  {getPublished().length === 0 ? (
                    <p className="donk-space-muted">暂无文字投稿记录。</p>
                  ) : (
                    <ul className="donk-space-work-list">
                      {getPublished().map((p) => (
                        <li key={p.id}>
                          <span className="donk-space-work-title">{p.title}</span>
                          <span>{new Date(p.at).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}

            {showSettings ? (
              <div className="donk-space-settings">
                <section className="donk-space-card">
                  <div className="donk-space-card-hd">
                    <h2>更换头像</h2>
                  </div>
                  <p className="donk-space-muted">支持常见图片格式，上传后立即生效。</p>
                  <div className="donk-space-field-row">
                    <label className="donk-space-file-label">
                      <input
                        type="file"
                        accept="image/*"
                        className="donk-space-file-input"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setError(null)
                          setInfo(null)
                          setSaving(true)
                          try {
                            const res = await uploadAvatar(file)
                            if (!res.ok) {
                              setError(res.message || '保存失败')
                              return
                            }
                            const me = await fetchCurrentUser()
                            if (me.ok && me.data) setProfile(me.data)
                            const avatarRes = await fetchMyAvatarUrl()
                            if (avatarRes.ok) setAvatarUrl(avatarRes.avatarUrl)
                            setInfo('头像已更新')
                          } finally {
                            setSaving(false)
                          }
                        }}
                      />
                      <span className="donk-space-btn-blue-outline">选择图片</span>
                    </label>
                    {saving ? <span className="donk-space-muted">上传中…</span> : null}
                  </div>
                  {info ? <div className="auth-info profile-flash">{info}</div> : null}
                  {error ? <div className="auth-error profile-flash">{error}</div> : null}
                </section>

                <section className="donk-space-card">
                  <div className="donk-space-card-hd">
                    <h2>修改密码</h2>
                  </div>
                  <div className="donk-space-password-form">
                    <label className="donk-space-label">
                      当前密码
                      <input
                        className="auth-input profile-input"
                        type="password"
                        autoComplete="current-password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                      />
                    </label>
                    <label className="donk-space-label">
                      新密码
                      <input
                        className="auth-input profile-input"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="donk-space-btn-blue"
                      disabled={saving}
                      onClick={async () => {
                        setError(null)
                        setInfo(null)
                        setSaving(true)
                        try {
                          const res = await changePassword(oldPassword, newPassword)
                          if (!res.ok) {
                            setError(res.message || '修改失败')
                            return
                          }
                          setInfo('密码修改成功')
                          setOldPassword('')
                          setNewPassword('')
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      保存新密码
                    </button>
                  </div>
                </section>

                <section className="donk-space-card">
                  <div className="donk-space-card-hd">
                    <h2>账号</h2>
                  </div>
                  <button type="button" className="donk-space-btn-ghost" onClick={() => void onLogout()}>
                    退出登录
                  </button>
                </section>
              </div>
            ) : null}
          </div>

          <aside className="donk-space-aside">
            <div className="donk-space-widget">
              <div className="donk-space-widget-title">认证</div>
              <p className="donk-space-widget-text">完成身份认证可获得更多权益（演示占位）。</p>
              <button type="button" className="donk-space-btn-blue-outline donk-space-widget-full">
                了解认证
              </button>
            </div>

            <div className="donk-space-widget donk-space-widget--accent">
              <div className="donk-space-widget-title">
                创作中心 <span className="donk-space-chevron">›</span>
              </div>
              <div className="donk-space-create-btns">
                <a className="donk-space-create-pink" href="#/util/上传视频">
                  视频投稿
                </a>
                <a className="donk-space-create-outline" href="#/util/投稿">
                  投稿管理
                </a>
              </div>
            </div>

            <div className="donk-space-widget">
              <div className="donk-space-widget-title">公告</div>
              <p className="donk-space-widget-text">感谢使用 donk666 演示空间。</p>
            </div>

            <div className="donk-space-widget">
              <div className="donk-space-widget-head">
                <span className="donk-space-widget-title">个人资料</span>
                <button type="button" className="donk-space-link-btn" onClick={() => setMainTab('settings')}>
                  编辑
                </button>
              </div>
              <dl className="donk-space-dl">
                <div>
                  <dt>UID</dt>
                  <dd>{uidDemo}</dd>
                </div>
                <div>
                  <dt>账号</dt>
                  <dd>{profile?.email || session.email}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
