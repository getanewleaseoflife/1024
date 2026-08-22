import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterview } from '../store/InterviewContext'

interface Persona {
  id: string
  name: string
  desc: string
  dot: string
  border: string
  bg: string
}

const PERSONAS: Persona[] = [
  {
    id: 'friendly',
    name: '随和型',
    desc: '同级工程师 · 轻松引导',
    dot: 'bg-persona-friendly',
    border: 'border-persona-friendly',
    bg: 'bg-persona-friendly/10',
  },
  {
    id: 'rigorous',
    name: '严谨型',
    desc: '资深专家 · 犀利专业',
    dot: 'bg-persona-rigorous',
    border: 'border-persona-rigorous',
    bg: 'bg-persona-rigorous/10',
  },
  {
    id: 'stress',
    name: '压力型',
    desc: 'HR 主管 · 压迫质疑',
    dot: 'bg-persona-stress',
    border: 'border-persona-stress',
    bg: 'bg-persona-stress/10',
  },
]

const GAP_STYLE = {
  have: { chip: 'text-success bg-success-bg', label: '已具备' },
  pending: { chip: 'text-warning bg-warning-bg', label: '待考察' },
  missing: { chip: 'text-danger bg-danger-bg', label: '缺失' },
} as const

export function Profile() {
  const navigate = useNavigate()
  const { state, setPersona } = useInterview()
  const [persona, setPersonaLocal] = useState(state.personaId)
  const { profile, gaps } = state

  const handleSelectPersona = (id: string) => {
    setPersonaLocal(id)
    setPersona(id)
  }

  return (
    <main className="max-w-4xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">能力画像</h1>
        <p className="text-muted-foreground mt-2">
          基于简历解析的能力标签与「{state.positionName}」岗位 Gap 分析。
        </p>
      </div>

      {/* 基础信息卡 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">候选人基础信息</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-soft text-primary grid place-items-center font-display font-semibold text-lg">
            {profile?.name?.charAt(0) || '候'}
          </div>
          <div>
            <div className="font-medium">{profile?.name || '未命名候选人'}</div>
            <div className="text-sm text-muted-foreground">
              {profile?.education || '学历信息待补充'}
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
          岗位 Gap 分析
          <span className="ml-3 inline-flex gap-2 text-[12px] font-normal">
            <span className="text-success">● 已具备</span>
            <span className="text-warning">● 待考察</span>
            <span className="text-danger">● 缺失</span>
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {gaps.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              暂无 Gap 数据，请先在简历输入页解析简历。
            </p>
          ) : (
            gaps.map((g) => (
              <span
                key={g.dimension}
                className={`inline-flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full ${GAP_STYLE[g.status].chip}`}
              >
                {g.dimension}
              </span>
            ))
          )}
        </div>
      </section>

      {/* 人格选择 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">选择面试官人格</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PERSONAS.map((p) => {
            const selected = persona === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPersona(p.id)}
                className={`relative text-left p-4 rounded-lg border transition ${
                  selected
                    ? `${p.border} ${p.bg}`
                    : 'border-border hover:border-muted-foreground/40'
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
                  <span className="font-medium">{p.name}</span>
                </div>
                <div className="text-[12px] text-muted-foreground">{p.desc}</div>
              </button>
            )
          })}
        </div>
      </section>

      <button
        onClick={() => navigate('/interview')}
        className="w-full h-12 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition"
      >
        开始面试
      </button>
    </main>
  )
}
