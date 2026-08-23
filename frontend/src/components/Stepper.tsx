import { Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Step {
  path: string
  labelKey: string
}

const STEPS: Step[] = [
  { path: '/position', labelKey: 'stepper.position' },
  { path: '/resume', labelKey: 'stepper.resume' },
  { path: '/profile', labelKey: 'stepper.profile' },
  { path: '/interview', labelKey: 'stepper.interview' },
  { path: '/report', labelKey: 'stepper.report' },
]

export function Stepper() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const currentIndex = STEPS.findIndex((s) => s.path === location.pathname)

  return (
    <nav className="bg-surface/70 backdrop-blur border-b border-border sticky top-16 z-30">
      <div className="max-w-6xl mx-auto px-5 py-3">
        <ol className="flex items-center">
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <Fragment key={step.path}>
                <li
                  className="flex items-center cursor-pointer group"
                  onClick={() => navigate(step.path)}
                >
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold border transition ${
                      isCurrent
                        ? 'bg-primary text-white border-primary'
                        : isDone
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'bg-surface text-muted-foreground border-border'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    className={`ml-2 text-[13px] transition ${
                      isCurrent
                        ? 'text-foreground font-medium'
                        : isDone
                          ? 'text-foreground'
                          : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    {t(step.labelKey)}
                  </span>
                </li>
                {i < STEPS.length - 1 && (
                  <li className="flex-1 mx-3 h-px bg-border">
                    <span
                      className="block h-full bg-primary transition-all"
                      style={{ width: isDone ? '100%' : '0%' }}
                    ></span>
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
