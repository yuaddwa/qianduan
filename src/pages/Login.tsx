import { useState } from 'react'
import { loginWithEmailCode, loginWithPassword, requestEmailCode } from '../auth/auth'

type Props = {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: Props) {
  const [mode, setMode] = useState<'password' | 'emailCode'>('password')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)

  return (
    <div className="auth-bg">
      <div className="auth-shell auth-shell--right">
        <div className="auth-card auth-card--big auth-card--login">
          <h1 className="auth-title">用户登录</h1>

          <div className="auth-tabs" role="tablist" aria-label="登录方式">
            <button
              className={`auth-tab ${mode === 'password' ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setMode('password')
                setError(null)
                setInfo(null)
              }}
              role="tab"
              aria-selected={mode === 'password'}
            >
              账号密码
            </button>
            <button
              className={`auth-tab ${mode === 'emailCode' ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setMode('emailCode')
                setError(null)
                setInfo(null)
              }}
              role="tab"
              aria-selected={mode === 'emailCode'}
            >
              邮箱验证码
            </button>
          </div>

          <form
            autoComplete="off"
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)
              setInfo(null)
              setSubmitting(true)
              try {
                if (mode === 'password') {
                  const res = await loginWithPassword(identifier, password, remember)
                  if (!res.ok) {
                    setError(res.message || '登录失败')
                    return
                  }
                  onLoginSuccess()
                  return
                }

                const res = await loginWithEmailCode(email, code, remember)
                if (!res.ok) {
                  setError(res.message || '登录失败')
                  return
                }
                onLoginSuccess()
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {mode === 'password' ? (
              <>
                <div className="auth-field">
                  <div className="auth-inputRow">
                    <span className="auth-icon" aria-hidden="true">
                      U
                    </span>
                    <input
                      className="auth-input auth-input--row"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="请输入账号或邮箱"
                      autoComplete="off"
                      name="login_identifier"
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
                      placeholder="请输入密码"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      name="login_password"
                    />
                    <button
                      type="button"
                      className="auth-eyeBtn"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="auth-field">
                  <div className="auth-inputRow">
                    <span className="auth-icon" aria-hidden="true">
                      @
                    </span>
                    <input
                      className="auth-input auth-input--row"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="请输入邮箱"
                      autoComplete="email"
                      inputMode="email"
                      name="email"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <div className="auth-codeRow">
                    <div className="auth-inputRow auth-inputRow--code">
                      <span className="auth-icon" aria-hidden="true">
                        #
                      </span>
                      <input
                        className="auth-input auth-input--row"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="请输入验证码"
                        inputMode="numeric"
                        name="code"
                      />
                    </div>
                    <button
                      className="btn btn--ghost btn--code"
                      type="button"
                      disabled={sendingCode}
                      onClick={async () => {
                        setError(null)
                        setInfo(null)
                        setSendingCode(true)
                        try {
                          const res = await requestEmailCode(email, 'LOGIN')
                          if (!res.ok) {
                            setError(res.message || '发送失败')
                            return
                          }
                          setInfo('验证码已发送，请查收邮箱（5分钟内有效）')
                        } finally {
                          setSendingCode(false)
                        }
                      }}
                    >
                      {sendingCode ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="auth-meta">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>7天免登录</span>
              </label>
              <a className="auth-link" href="#/forgot">
                忘记密码？
              </a>
            </div>

            {info ? <div className="auth-info">{info}</div> : null}
            {error ? <div className="auth-error">{error}</div> : null}

            <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
              {submitting ? '登录中...' : '登 录'}
            </button>

            <div className="auth-foot">
              <span className="auth-muted">还没有账号？</span>{' '}
              <a className="auth-link" href="#/register">
                立即注册
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

