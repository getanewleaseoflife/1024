import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!username.trim() || !password) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), password)
      navigate('/')
    } catch {
      setError(t(mode === 'login' ? 'auth.failed' : 'auth.registerFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (user) return <Navigate to="/" replace />

  return (
    <main className="max-w-sm mx-auto px-5 py-16">
      <div className="bg-surface border border-border rounded-card p-8 shadow-card">
        <h1 className="font-display text-xl font-semibold text-center">
          {t(mode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle')}
        </h1>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5">
              {t('auth.username')}
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.usernamePlaceholder')}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={t('auth.passwordPlaceholder')}
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {error && <p className="text-[13px] text-destructive">{error}</p>}

          <button
            onClick={submit}
            disabled={busy || !username.trim() || !password}
            className="w-full h-10 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t(mode === 'login' ? 'auth.loginSubmit' : 'auth.registerSubmit')}
          </button>
        </div>

        <button
          onClick={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'))
            setError('')
          }}
          className="mt-4 w-full text-[13px] text-primary hover:underline"
        >
          {t(mode === 'login' ? 'auth.switchToRegister' : 'auth.switchToLogin')}
        </button>
      </div>
    </main>
  )
}
