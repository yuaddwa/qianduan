export type Session = {
  username: string
  email: string
  token: string
  tokenType: string
  createdAt: number
  expiresAt: number
  avatarUrl?: string
  nickname?: string
}

export type UserProfile = {
  id?: number
  username: string
  email: string
  nickname?: string
  avatarUrl?: string
  role?: string
  enabled?: boolean
}

const SESSION_KEY = 'vite-auth_session'

/** 与 kx 并存：生产默认走 /donk-api/，Nginx 再转到 8080 的 /api/；本地 dev 仍用 /api（见 vite proxy） */
function donkApiPrefix(): string {
  const v = import.meta.env.VITE_DONK_API_PREFIX
  if (v === '') return ''
  if (typeof v === 'string' && v.trim() !== '') return v.trim().replace(/\/$/, '')
  return import.meta.env.PROD ? '/donk-api' : ''
}

function apiUrl(path: string): string {
  const prefix = donkApiPrefix()
  if (!prefix || !path.startsWith('/api')) return path
  return `${prefix}${path.replace(/^\/api/, '')}`
}

/** 接口返回的 /uploads/... 或写死 :8080 的地址，转为当前页面域名可访问的 URL（走 80 端口 Nginx，避免图裂） */
export function resolvePublicUrl(raw?: string | null): string | undefined {
  if (raw == null) return undefined
  const s = String(raw).trim()
  if (!s) return undefined
  if (s.startsWith('data:') || s.startsWith('blob:')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(s)
      if (typeof window !== 'undefined' && u.hostname === window.location.hostname && u.port === '8080') {
        return `${window.location.origin}${u.pathname}${u.search}`
      }
    } catch {
      /* ignore */
    }
    return s
  }
  const path = s.startsWith('/') ? s : `/${s}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function persistSession(session: Session, remember7Days: boolean) {
  const storage = remember7Days ? localStorage : sessionStorage
  const removeStorage = remember7Days ? sessionStorage : localStorage
  storage.setItem(SESSION_KEY, JSON.stringify(session))
  removeStorage.removeItem(SESSION_KEY)
}

function parseTokenPayload(data: unknown) {
  const obj = (data ?? {}) as Record<string, unknown>
  const token = String(obj.token ?? obj.accessToken ?? '')
  const tokenType = String(obj.tokenType ?? 'Bearer')
  const expiresInRaw = Number(obj.expiresIn ?? 7200)
  const expiresIn = Number.isFinite(expiresInRaw) && expiresInRaw > 0 ? expiresInRaw : 7200
  const username = String(obj.username ?? obj.userName ?? '')
  return { token, tokenType, expiresIn, username }
}

function authHeader(token: string, tokenType = 'Bearer') {
  return `${tokenType || 'Bearer'} ${token}`
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; message?: string; data?: T; status: number }> {
  try {
    const res = await fetch(apiUrl(path), init)
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T> | T
    if (!res.ok) {
      const msg =
        ((body as ApiEnvelope<T>)?.message as string | undefined) ||
        `请求失败(${res.status})`
      return { ok: false, status: res.status, message: msg }
    }

    const env = body as ApiEnvelope<T>
    if ('data' in env || 'success' in env || 'message' in env) {
      return { ok: true, status: res.status, data: env.data, message: env.message }
    }
    return { ok: true, status: res.status, data: body as T }
  } catch {
    return { ok: false, status: 0, message: '网络异常，请检查服务器地址或跨域配置' }
  }
}

export function getSession(): Session | null {
  const fromLocal = safeJsonParse<Session | null>(localStorage.getItem(SESSION_KEY), null)
  const fromSession = safeJsonParse<Session | null>(sessionStorage.getItem(SESSION_KEY), null)
  const session = fromLocal ?? fromSession
  if (!session) return null
  if (Date.now() >= session.expiresAt) {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
  return session
}

export async function logout() {
  const session = getSession()
  if (session?.token) {
    await requestJson('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: authHeader(session.token, session.tokenType),
      },
    })
  }
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export async function registerUser(usernameInput: string, emailInput: string, password: string) {
  const username = usernameInput.trim()
  const email = normalizeEmail(emailInput)
  if (!username) return { ok: false, message: '用户名不能为空' }
  if (!email) return { ok: false, message: '邮箱不能为空' }
  if (!password) return { ok: false, message: '密码不能为空' }

  return requestJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })
}

async function fetchMeByToken(token: string, tokenType = 'Bearer') {
  return requestJson<UserProfile>('/api/users/me', {
    method: 'GET',
    headers: {
      Authorization: authHeader(token, tokenType),
    },
  })
}

export async function loginWithPassword(identifierInput: string, password: string, remember7Days: boolean) {
  const account = identifierInput.trim()
  if (!account) return { ok: false, message: '请输入账号或邮箱' }
  if (!password) return { ok: false, message: '请输入密码' }

  const loginRes = await requestJson<unknown>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  })
  if (!loginRes.ok) return { ok: false, message: loginRes.message || '登录失败' }

  const payload = parseTokenPayload(loginRes.data)
  if (!payload.token) return { ok: false, message: '登录成功但未返回 token' }

  const meRes = await fetchMeByToken(payload.token, payload.tokenType)
  if (!meRes.ok || !meRes.data) return { ok: false, message: meRes.message || '获取用户信息失败' }

  const now = Date.now()
  const expiresAt = remember7Days
    ? now + 7 * 24 * 60 * 60 * 1000
    : now + payload.expiresIn * 1000

  const session: Session = {
    username: meRes.data.username || payload.username || account,
    email: meRes.data.email || '',
    token: payload.token,
    tokenType: payload.tokenType,
    createdAt: now,
    expiresAt,
    avatarUrl: resolvePublicUrl(meRes.data.avatarUrl),
    nickname: meRes.data.nickname,
  }
  persistSession(session, remember7Days)
  return { ok: true as const, session }
}

export async function requestEmailCode(emailInput: string, purpose: 'LOGIN' | 'RESET_PASSWORD' | 'REGISTER') {
  const email = normalizeEmail(emailInput)
  if (!email) return { ok: false, message: '邮箱不能为空' }
  return requestJson('/api/auth/email-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose }),
  })
}

export async function loginWithEmailCode(emailInput: string, code: string, remember7Days: boolean) {
  const email = normalizeEmail(emailInput)
  const trimmedCode = code.trim()
  if (!email) return { ok: false, message: '邮箱不能为空' }
  if (!trimmedCode) return { ok: false, message: '请输入验证码' }

  const loginRes = await requestJson<unknown>('/api/auth/login/email-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code: trimmedCode }),
  })
  if (!loginRes.ok) return { ok: false, message: loginRes.message || '登录失败' }

  const payload = parseTokenPayload(loginRes.data)
  if (!payload.token) return { ok: false, message: '登录成功但未返回 token' }

  const meRes = await fetchMeByToken(payload.token, payload.tokenType)
  if (!meRes.ok || !meRes.data) return { ok: false, message: meRes.message || '获取用户信息失败' }

  const now = Date.now()
  const expiresAt = remember7Days
    ? now + 7 * 24 * 60 * 60 * 1000
    : now + payload.expiresIn * 1000

  const session: Session = {
    username: meRes.data.username || payload.username || email,
    email: meRes.data.email || email,
    token: payload.token,
    tokenType: payload.tokenType,
    createdAt: now,
    expiresAt,
    avatarUrl: resolvePublicUrl(meRes.data.avatarUrl),
    nickname: meRes.data.nickname,
  }
  persistSession(session, remember7Days)
  return { ok: true as const, session }
}

// 目前文档未提供“忘记密码重置”接口，仅支持登录态改密
export async function resetPasswordByEmailCode() {
  return { ok: false, message: '后端暂未提供重置密码接口，请登录后在个人页修改密码' as const }
}

export async function fetchCurrentUser() {
  const session = getSession()
  if (!session) return { ok: false, message: '未登录' }
  const meRes = await fetchMeByToken(session.token, session.tokenType)
  if (!meRes.ok || !meRes.data) return { ok: false, message: meRes.message || '获取用户信息失败' }

  const next: Session = {
    ...session,
    username: meRes.data.username || session.username,
    email: meRes.data.email || session.email,
    avatarUrl: resolvePublicUrl(meRes.data.avatarUrl),
    nickname: meRes.data.nickname,
  }

  const inLocal = !!localStorage.getItem(SESSION_KEY)
  persistSession(next, inLocal)
  return { ok: true as const, data: meRes.data, session: next }
}

export async function fetchMyAvatarUrl() {
  const session = getSession()
  if (!session) return { ok: false, message: '未登录' as const }
  const res = await requestJson<{ avatarUrl?: string }>('/api/users/me/avatar', {
    method: 'GET',
    headers: {
      Authorization: authHeader(session.token, session.tokenType),
    },
  })
  if (!res.ok) return { ok: false as const, message: res.message || '获取头像失败' }
  return {
    ok: true as const,
    avatarUrl: resolvePublicUrl(res.data?.avatarUrl),
  }
}

export async function uploadAvatar(file: File) {
  const session = getSession()
  if (!session) return { ok: false, message: '未登录' }
  const formData = new FormData()
  formData.append('file', file)

  const res = await requestJson<UserProfile>('/api/users/me/avatar', {
    method: 'POST',
    headers: {
      Authorization: authHeader(session.token, session.tokenType),
    },
    body: formData,
  })
  if (!res.ok) return { ok: false, message: res.message || '上传失败' }

  await fetchCurrentUser()
  return { ok: true as const, data: res.data }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const session = getSession()
  if (!session) return { ok: false, message: '未登录' }
  if (!oldPassword || !newPassword) return { ok: false, message: '请输入旧密码和新密码' }
  return requestJson('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(session.token, session.tokenType),
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  })
}

