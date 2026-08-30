import { Fragment } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useInterview } from '../store/InterviewContext'

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
  const { state } = useInterview()
  const currentIndex = STEPS.findIndex((s) => s.path === location.pathname)

  // 环节门禁：只有完成上一个环节，才能进入下一个
  const reachable = [
    true, // 岗位选择：始终可进
    state.positionId !== '', // 简历输入：已选岗位
    state.profile !== null, // 能力画像：简历已解析
    state.profile !== null && state.avatar !== '', // 模拟面试：画像 + 大头照
    state.interviewDone, // 评估报告：面试完全结束
  ]

  const handleClick = (step: Step, index: number) => {
    if (reachable[index]) navigate(step.path)
  }

  return (
    <nav className="bg-surface/70 backdrop-blur border-b border-border sticky top-16 z-30">
      <div className="max-w-6xl mx-auto px-5 py-3">
        <ol className="flex items-center">
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            const locked = !reachable[i]
            return (
              <Fragment key={step.path}>
                <li
                  className={`flex items-center ${locked ? 'cursor-not-allowed opacity-45' : 'cursor-pointer group'}`}
                  onClick={() => handleClick(step, i)}
                >
                  <span
                    className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold border transition ${
                      locked
                        ? 'bg-surface text-muted-foreground border-border'
                        : isCurrent
                          ? 'bg-primary text-white border-primary'
                          : isDone
                            ? 'bg-primary/10 text-primary border-primary'
                            : 'bg-surface text-muted-foreground border-border'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`ml-2 text-[13px] transition ${
                      locked
                        ? 'text-muted-foreground'
                        : isCurrent
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
