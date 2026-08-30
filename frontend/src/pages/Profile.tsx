import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInterview } from '../store/InterviewContext'
import { compressImage } from '../utils/image'

interface Persona {
  id: string
  nameKey: string
  descKey: string
  dot: string
  border: string
  bg: string
}

const PERSONAS: Persona[] = [
  {
    id: 'friendly',
    nameKey: 'persona.friendly',
    descKey: 'persona.friendlyDesc',
    dot: 'bg-persona-friendly',
    border: 'border-persona-friendly',
    bg: 'bg-persona-friendly/10',
  },
  {
    id: 'rigorous',
    nameKey: 'persona.rigorous',
    descKey: 'persona.rigorousDesc',
    dot: 'bg-persona-rigorous',
    border: 'border-persona-rigorous',
    bg: 'bg-persona-rigorous/10',
  },
  {
    id: 'stress',
    nameKey: 'persona.stress',
    descKey: 'persona.stressDesc',
    dot: 'bg-persona-stress',
    border: 'border-persona-stress',
    bg: 'bg-persona-stress/10',
  },
]

const GAP_STYLE = {
  have: 'text-success bg-success-bg',
  pending: 'text-warning bg-warning-bg',
  missing: 'text-danger bg-danger-bg',
} as const

export function Profile() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { state, setPersona, setFastMode, setAvatar, setAvatarEnabled, setReadAloud } = useInterview()
  const [persona, setPersonaLocal] = useState(state.personaId)
  const { profile, gaps, avatar } = state
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectPersona = (id: string) => {
    setPersonaLocal(id)
    setPersona(id)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const base64 = await compressImage(file)
      setAvatar(base64)
    } catch {
      // 压缩失败忽略，保留原头像
    }
    e.target.value = ''
  }

  return (
    <main className="max-w-4xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('profile.desc', { position: state.positionName })}
        </p>
      </div>

      {/* 基础信息卡 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('profile.basicInfo')}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-primary-soft text-primary grid place-items-center font-display font-semibold text-2xl shrink-0 cursor-pointer group"
            title={t('profile.avatar')}
          >
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0) || '?'
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 text-white text-[11px] flex items-center justify-center transition">
              {t('profile.upload')}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <div className="font-medium">{profile?.name || t('profile.unnamed')}</div>
            <div className="text-sm text-muted-foreground">
              {profile?.education || t('profile.eduEmpty')}
            </div>
          </div>
        </div>
        {profile && profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="text-[12px] text-primary px-2 py-0.5 rounded-full bg-primary-soft"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Gap 标签墙 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {t('profile.gapTitle')}
          <span className="ml-3 inline-flex gap-2 text-[12px] font-normal">
            <span className="text-success">● {t('profile.have')}</span>
            <span className="text-warning">● {t('profile.waiting')}</span>
            <span className="text-danger">● {t('profile.missing')}</span>
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {gaps.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t('profile.gapEmpty')}</p>
          ) : (
            gaps.map((g) => (
              <span
                key={g.dimension}
                className={`inline-flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full ${GAP_STYLE[g.status]}`}
              >
                {g.dimension}
              </span>
            ))
          )}
        </div>
      </section>

      {/* 人格选择 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('profile.personaTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PERSONAS.map((p) => {
            const selected = persona === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPersona(p.id)}
                className={`relative text-left p-4 rounded-lg border transition ${
                  selected ? `${p.border} ${p.bg}` : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                {selected && (
                  <span
                    className={`absolute top-2 right-2 w-5 h-5 rounded-full ${p.dot} text-white grid place-items-center text-[11px]`}
                  >
                    ✓
                  </span>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`}></span>
                  <span className="font-medium">{t(p.nameKey)}</span>
                </div>
                <div className="text-[12px] text-muted-foreground">{t(p.descKey)}</div>
              </button>
            )
          })}
        </div>
      </section>

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={state.fastMode}
          onChange={(e) => setFastMode(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm">{t('profile.fastMode')}</span>
      </label>

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={state.avatarEnabled}
          onChange={(e) => setAvatarEnabled(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm">{t('profile.avatarEnabled')}</span>
      </label>

      <label
        className={`flex items-center gap-2 mb-4 cursor-pointer ${!state.avatarEnabled ? 'opacity-50' : ''}`}
      >
        <input
          type="checkbox"
          checked={state.readAloud}
          disabled={!state.avatarEnabled}
          onChange={(e) => setReadAloud(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm">{t('profile.readAloud')}</span>
      </label>

      <button
        onClick={() => navigate('/interview')}
        disabled={!avatar}
        className="w-full h-12 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {avatar ? t('profile.start') : t('profile.avatarRequired')}
      </button>
    </main>
  )
}
