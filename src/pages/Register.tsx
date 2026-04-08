import { useState } from 'react'
import { registerUser } from '../auth/auth'

type Props = {
  onRegisterSuccess: () => void
}

export default function Register({ onRegisterSuccess }: Props) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="auth-bg">
      <div className="auth-shell">
        <div className="auth-card auth-card--big">
          <h1 className="auth-title">注册</h1>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setSubmitting(true)
              try {
                const res = await registerUser(username, email, password)
                if (!res.ok) {
                  setError(res.message || '注册失败')
                  return
                }
                onRegisterSuccess()
              } finally {
                setSubmitting(false)
              }
            }}
          >
            <div className="auth-field">
              <div className="auth-inputRow">
                <span className="auth-icon" aria-hidden="true">
                  @
                </span>
                <input
                  className="auth-input auth-input--row"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱"
                  autoComplete="email"
                  inputMode="email"
                  name="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-inputRow">
                <span className="auth-icon" aria-hidden="true">
                  U
                </span>
                <input
                  className="auth-input auth-input--row"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名（3-20位）"
                  autoComplete="username"
                  name="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-inputRow">
                <span className="auth-icon" aria-hidden="true">
                  *
                </span>
                <input
                  className="auth-input auth-input--row"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码（6-30位）"
                  type="password"
                  autoComplete="new-password"
                  name="password"
                />
              </div>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
              {submitting ? '创建中...' : '注 册'}
            </button>

            <div className="auth-foot">
              <span className="auth-muted">已有账号？</span>{' '}
              <a className="auth-link" href="#/login">
                返回登录
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

