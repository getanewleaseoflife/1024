import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, Square } from 'lucide-react'
import { createAvatar } from '@dicebear/core'
import * as bottts from '@dicebear/bottts'
import type { Options } from '@dicebear/bottts'

/**
 * 头像来源：DiceBear「Bottts」机器人风格（@dicebear/bottts）。
 * 设计 remix of Bottts by Pablo Stanley — 免费用于个人与商业；npm 代码 MIT。
 * 署名已随 SVG metadata 内嵌（<dc:creator>Pablo Stanley</dc:creator>）。
 */

export type AvatarStatus = 'idle' | 'thinking' | 'speaking' | 'paused'

interface InterviewerAvatarProps {
  personaId: string
  status: AvatarStatus
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
}

interface PersonaConfig {
  color: string // 主色（机器人 baseColor / 声波环）
  options: Pick<Options, 'face' | 'mouth' | 'eyes' | 'top' | 'sides'>
}

// 3 档人格：机器人「脸型 + 嘴(表情) + 眼 + 头顶 + 侧板」差异化
const PERSONAS: Record<string, PersonaConfig> = {
  friendly: {
    color: '#0D9488',
    options: {
      face: ['round01'],
      mouth: ['smile01'],
      eyes: ['happy'],
      top: ['antenna'],
      sides: ['round'],
    },
  },
  rigorous: {
    color: '#0369A1',
    options: {
      face: ['square01'],
      mouth: ['square01'],
      eyes: ['robocop'],
      top: ['radar'],
      sides: ['square'],
    },
  },
  stress: {
    color: '#BE123C',
    options: {
      face: ['square03'],
      mouth: ['bite'],
      eyes: ['shade01'],
      top: ['horns'],
      sides: ['squareAssymetric'],
    },
  },
}

const STATUS_CLASS: Record<AvatarStatus, string> = {
  idle: '',
  thinking: 'avatar-thinking',
  speaking: 'avatar-speaking',
  paused: '',
}

const CONTROL_CLASS =
  'flex items-center gap-1 text-[12px] px-3 py-1 rounded-full border border-border text-muted-foreground transition'

export function InterviewerAvatar({
  personaId,
  status,
  onPause,
  onResume,
  onStop,
}: InterviewerAvatarProps) {
  const { t } = useTranslation()
  const config = PERSONAS[personaId] ?? PERSONAS.rigorous

  const svg = useMemo(() => {
    const c = PERSONAS[personaId] ?? PERSONAS.rigorous
    return createAvatar(bottts, {
      seed: personaId,
      baseColor: [c.color],
      textureProbability: 0, // 关闭纹理，保持干净
      ...c.options,
    }).toString()
  }, [personaId])

  const statusLabel =
    status === 'speaking'
      ? 'speaking'
      : status === 'thinking'
        ? 'thinking'
        : status === 'paused'
          ? 'paused'
          : null

  return (
    <div className="bg-surface border border-border rounded-card shadow-card p-5 flex flex-col items-center gap-3">
      <div
        className={`relative w-36 h-36 ${
          status === 'speaking' ? 'avatar-talk' : status === 'thinking' ? 'avatar-sway' : ''
        }`}
      >
        <div
          className={`w-full h-full rounded-2xl overflow-hidden border border-border ${STATUS_CLASS[status]}`}
        >
          {/* DiceBear 生成的 SVG（自带白底，靠 .avatar-svg 撑满） */}
          <div className="avatar-svg w-full h-full" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        {status === 'speaking' && (
          <>
            <span
              className="absolute inset-0 rounded-2xl avatar-ring pointer-events-none"
              style={{ border: `2px solid ${config.color}` }}
            />
            {/* 口型唇条：随 TTS 播报开合 */}
            <span
              className="avatar-mouth"
              style={{ background: config.color, color: config.color }}
            />
          </>
        )}
      </div>

      <div className="text-sm font-medium">{t(`persona.${personaId}`)}</div>
      <div className="text-[12px] text-muted-foreground min-h-[16px]">
        {statusLabel ? t(`interview.${statusLabel}`) : ''}
      </div>

      {status === 'speaking' && (
        <div className="flex gap-2">
          {onPause && (
            <button
              onClick={onPause}
              className={`${CONTROL_CLASS} hover:text-primary hover:border-primary`}
            >
              <Pause className="w-3.5 h-3.5" /> {t('interview.pause')}
            </button>
          )}
          {onStop && (
            <button
              onClick={onStop}
              className={`${CONTROL_CLASS} hover:text-danger hover:border-danger`}
            >
              <Square className="w-3.5 h-3.5" /> {t('interview.stop')}
            </button>
          )}
        </div>
      )}
      {status === 'paused' && (
        <div className="flex gap-2">
          {onResume && (
            <button
              onClick={onResume}
              className={`${CONTROL_CLASS} hover:text-primary hover:border-primary`}
            >
              <Play className="w-3.5 h-3.5" /> {t('interview.resume')}
            </button>
          )}
          {onStop && (
            <button
              onClick={onStop}
              className={`${CONTROL_CLASS} hover:text-danger hover:border-danger`}
            >
              <Square className="w-3.5 h-3.5" /> {t('interview.stop')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
