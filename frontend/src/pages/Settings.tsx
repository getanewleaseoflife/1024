import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPut } from '../api/client'
import { useInterview } from '../store/InterviewContext'

interface SettingsData {
  llm_base_url: string
  llm_model: string
  tts_voice: string
}

const VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓 · 温柔女声' },
  { id: 'zh-CN-XiaoyiNeural', label: '晓伊 · 活泼女声' },
  { id: 'zh-CN-YunxiNeural', label: '云希 · 沉稳男声' },
  { id: 'zh-CN-YunyangNeural', label: '云扬 · 严肃男声' },
  { id: 'zh-CN-YunjianNeural', label: '云健 · 激情男声' },
  { id: 'zh-CN-YunxiaNeural', label: '云夏 · 青年男声' },
]

const PROVIDERS = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  {
    id: 'qwen',
    label: '通义千问 Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  { id: 'custom', label: '自定义', baseUrl: '', model: '' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-primary' : 'bg-muted'}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function Settings() {
  const { t } = useTranslation()
  const { state, setAvatarEnabled, setReadAloud, setTtsVoice } = useInterview()
  const [provider, setProvider] = useState('custom')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiGet<SettingsData>('/settings')
      .then((s) => {
        if (s.llm_base_url) setBaseUrl(s.llm_base_url)
        if (s.llm_model) setModel(s.llm_model)
        const matched = PROVIDERS.find(
          (p) => p.baseUrl && p.baseUrl === s.llm_base_url && p.model === s.llm_model,
        )
        if (matched) setProvider(matched.id)
      })
      .catch(() => {})
  }, [])

  const pickProvider = (id: string) => {
    setProvider(id)
    const p = PROVIDERS.find((x) => x.id === id)
    if (p) {
      setBaseUrl(p.baseUrl)
      setModel(p.model)
    }
  }

  const save = async () => {
    setMsg('')
    try {
      await apiPut('/settings', {
        llm_base_url: baseUrl,
        llm_model: model,
        tts_voice: state.ttsVoice,
      })
      setMsg(t('settings.saved'))
    } catch {
      setMsg(t('settings.saveFailed'))
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('settings.title')}</h1>
      </div>

      {/* 语音 / 虚拟人 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.voice')}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {t('settings.voiceDesc')}
            </div>
          </div>
          <Toggle checked={state.readAloud} onChange={setReadAloud} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">{t('settings.ttsVoice')}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {t('settings.ttsVoiceDesc')}
            </div>
          </div>
          <select
            value={state.ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">{t('settings.ttsVoiceAuto')}</option>
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{t('settings.avatar')}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {t('settings.avatarDesc')}
            </div>
          </div>
          <Toggle checked={state.avatarEnabled} onChange={setAvatarEnabled} />
        </div>
      </section>

      {/* 多 provider */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <div className="font-medium mb-1">{t('settings.provider')}</div>
        <div className="text-[13px] text-muted-foreground mb-4">{t('settings.providerDesc')}</div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickProvider(p.id)}
              className={`h-8 px-3 rounded-md text-[13px] font-medium border transition ${
                provider === p.id
                  ? 'bg-primary-soft text-primary border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium mb-1.5">
              {t('settings.baseUrl')}
            </label>
            <input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value)
                setProvider('custom')
              }}
              placeholder="https://api.deepseek.com"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium mb-1.5">
              {t('settings.model')}
            </label>
            <input
              id="model"
              value={model}
              onChange={(e) => {
                setModel(e.target.value)
                setProvider('custom')
              }}
              placeholder="deepseek-chat"
              className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={save}
            className="h-10 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition"
          >
            {t('settings.save')}
          </button>
          {msg && <span className="text-[13px] text-muted-foreground">{msg}</span>}
        </div>
      </section>
    </main>
  )
}
