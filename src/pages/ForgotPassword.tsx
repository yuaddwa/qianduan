import { useState } from 'react'
import { requestEmailCode, resetPasswordByEmailCode } from '../auth/auth'

type Props = {
  onDone: () => void
}

export default function ForgotPassword({ onDone }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="auth-bg">
      <div className="auth-shell">
        <div className="auth-card auth-card--big">
          <h1 className="auth-title">忘记密码</h1>

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
            <div className="auth-codeRow">
              <div className="auth-inputRow auth-inputRow--code">
                <span className="auth-icon" aria-hidden="true">
                  #
                </span>
                <input
                  className="auth-input auth-input--row"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="验证码（6位）"
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
                    const res = await requestEmailCode(email, 'RESET_PASSWORD')
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

          <div className="auth-field">
            <div className="auth-inputRow">
              <span className="auth-icon" aria-hidden="true">
                *
              </span>
              <input
                className="auth-input auth-input--row"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码（6-30位）"
                type="password"
                autoComplete="new-password"
                name="newPassword"
              />
            </div>
          </div>

          {info ? <div className="auth-info">{info}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <button
            className="btn btn--primary btn--block"
            type="button"
            disabled={submitting}
            onClick={async () => {
              setError(null)
              setInfo(null)
              setSubmitting(true)
              try {
                const res = await resetPasswordByEmailCode()
                if (!res.ok) {
                  setError(res.message || '重置失败')
                  return
                }
                setInfo('密码已重置，请返回登录')
                onDone()
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? '处理中...' : '重置密码'}
          </button>

          <div className="auth-foot">
            <a className="auth-link" href="#/login">
              返回登录
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

