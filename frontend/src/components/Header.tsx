import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const NAV = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/history', labelKey: 'nav.history', end: false },
  { to: '/position', labelKey: 'nav.interview', end: false },
  { to: '/settings', labelKey: 'nav.settings', end: false },
]

export function Header() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary text-white grid place-items-center">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9.3 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.55 12l2.846-.813a4.5 4.5 0 003.09-3.09L9.3 5.25l.513 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
          </div>
          <div>
            <div className="font-display font-semibold text-[15px] leading-tight">
              {t('header.title')}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {t('header.subtitle')}
            </div>
          </div>
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `h-8 px-3 rounded-md text-[13px] font-medium flex items-center transition ${
                    isActive
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => i18n.changeLanguage(isZh ? 'en' : 'zh-CN')}
            className="h-8 px-2.5 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:text-primary hover:border-primary transition"
            title="Switch language"
          >
            {isZh ? 'EN' : '中文'}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium">{user.username}</span>
              <button
                onClick={handleLogout}
                className="h-8 px-2.5 rounded-md border border-border text-[12px] font-medium text-muted-foreground hover:text-danger hover:border-danger transition"
              >
                {t('auth.logout')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="h-8 px-3 rounded-md text-[13px] font-medium bg-primary text-white hover:bg-primary-hover transition"
            >
              {t('auth.login')}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
