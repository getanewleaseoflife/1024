import { useTranslation } from 'react-i18next'

export type AvatarStatus = 'idle' | 'thinking' | 'speaking'

interface InterviewerAvatarProps {
  personaId: string
  status: AvatarStatus
}

// 3 档人格配色（与 tailwind.config.js 的 persona token 保持一致）
const PERSONA_COLORS: Record<string, { color: string; soft: string }> = {
  friendly: { color: '#0D9488', soft: '#CCFBF1' },
  rigorous: { color: '#0369A1', soft: '#E0F2FE' },
  stress: { color: '#BE123C', soft: '#FFE4E6' },
}

const STATUS_CLASS: Record<AvatarStatus, string> = {
  idle: '',
  thinking: 'avatar-thinking',
  speaking: 'avatar-speaking',
}

/**
 * 面试官虚拟人形象：参数化 SVG（随人格配色）+ 三态动画。
 * 纯前端静态形象，无外部资源、无额外依赖；说话/思考动画由 CSS 驱动。
 */
export function InterviewerAvatar({ personaId, status }: InterviewerAvatarProps) {
  const { t } = useTranslation()
  const { color, soft } = PERSONA_COLORS[personaId] ?? PERSONA_COLORS.rigorous

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5 flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <div className={`w-full h-full ${STATUS_CLASS[status]}`}>
          <svg viewBox="0 0 120 120" role="img" aria-label={t(`persona.${personaId}`)}>
            <circle cx="60" cy="60" r="58" fill={soft} stroke={color} strokeWidth="2" />
            {/* 肩部 */}
            <path d="M24 120 C24 98 40 86 60 86 C80 86 96 98 96 120 Z" fill={color} />
            {/* 头部 */}
            <circle cx="60" cy="52" r="22" fill={color} />
            {/* 面部 */}
            <circle cx="52" cy="50" r="2.6" fill={soft} />
            <circle cx="68" cy="50" r="2.6" fill={soft} />
            <path
              d="M52 60 Q60 66 68 60"
              stroke={soft}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {status === 'speaking' && (
          <span
            className="absolute inset-0 rounded-full avatar-ring pointer-events-none"
            style={{ border: `2px solid ${color}` }}
          />
        )}
      </div>

      <div className="text-sm font-medium">{t(`persona.${personaId}`)}</div>
      <div className="text-[12px] text-muted-foreground min-h-[16px]">
        {status === 'speaking' ? t('interview.speaking') : status === 'thinking' ? t('interview.thinking') : ''}
      </div>
    </div>
  )
}
