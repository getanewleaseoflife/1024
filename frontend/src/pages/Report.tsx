import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import type { Report as ReportData } from '../api/types'
import { getUserId } from '../api/user'
import { useInterview } from '../store/InterviewContext'
import { RadarChart } from '../components/RadarChart'

const SOFT_SKILL_KEYS: Record<string, string> = {
  沟通表达: 'report.communication',
  逻辑思维: 'report.logic',
  临场应变: 'report.adaptability',
}

function StarCell({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-primary mb-1">{label}</div>
      <p className="text-[13px] leading-relaxed">{text}</p>
    </div>
  )
}

function matchLevel(score: number): { labelKey: string; chip: string } {
  if (score >= 85) return { labelKey: 'matchLevel.excellent', chip: 'text-success bg-success-bg' }
  if (score >= 70) return { labelKey: 'matchLevel.good', chip: 'text-primary bg-primary-soft' }
  if (score >= 60) return { labelKey: 'matchLevel.improve', chip: 'text-warning bg-warning-bg' }
  return { labelKey: 'matchLevel.weak', chip: 'text-danger bg-danger-bg' }
}

export function Report() {
  const { t } = useTranslation()
  const { state } = useInterview()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const [searchParams] = useSearchParams()
  const historyId = searchParams.get('history_id')

  useEffect(() => {
    if (historyId) {
      apiGet<{ report: ReportData }>(`/history/${historyId}`)
        .then((d) => setReport(d.report))
        .catch(() => setReport(null))
        .finally(() => setLoading(false))
    } else {
      apiPost<ReportData>('/report/generate', {
        session_id: '',
        position_id: state.positionId,
        persona_id: state.personaId,
        user_id: getUserId(),
        evidence: state.evidence,
        dialogues: [],
      })
        .then(setReport)
        .catch(() => setReport(null))
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyId])

  if (loading) {
    return <main className="max-w-5xl mx-auto px-5 py-10 text-muted-foreground">{t('report.generating')}</main>
  }

  if (!report) {
    return <main className="max-w-5xl mx-auto px-5 py-10 text-muted-foreground">{t('report.failed')}</main>
  }

  const level = matchLevel(report.match_score)

  return (
    <main className="max-w-5xl mx-auto px-5 py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('report.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('report.desc')}</p>
      </div>

      {state.avatar && (
        <section className="flex items-center gap-4 bg-surface border border-border rounded-card p-5 shadow-card">
          <img src={state.avatar} alt="candidate" className="w-12 h-12 rounded-full object-cover" />
          <div>
            <div className="font-medium">{state.profile?.name || t('profile.unnamed')}</div>
            <div className="text-sm text-muted-foreground">{report.position_name}</div>
          </div>
        </section>
      )}

      {/* 综合匹配度 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">{t('report.match')}</div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold text-primary">{report.match_score}%</span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${level.chip}`}>
              {t(level.labelKey)}
            </span>
          </div>
        </div>
        <div className="text-right text-[13px] text-muted-foreground">
          <div>{report.position_name}</div>
          <div>
            {state.personaId === 'rigorous'
              ? t('persona.rigorous')
              : state.personaId === 'friendly'
                ? t('persona.friendly')
                : t('persona.stress')}
          </div>
        </div>
      </section>

      {/* 能力雷达图 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <h2 className="font-medium mb-4">{t('report.radar')}</h2>
        <RadarChart indicators={report.radar} />
        <table className="mt-4 w-full text-[13px]" role="table">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 font-medium">{t('report.dimension')}</th>
              <th className="py-2 font-medium">{t('report.score')}</th>
            </tr>
          </thead>
          <tbody>
            {report.radar.map((r) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="py-2">{r.name}</td>
                <td className="py-2">
                  {r.value === null ? (
                    <span className="text-neutral">{t('report.notExamined')}</span>
                  ) : (
                    <span>{r.value} / 5</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 分维度得分卡（证据绑定） */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <h2 className="font-medium mb-4">{t('report.dimensionScore')}</h2>
        <div className="space-y-3">
          {report.dimension_scores.map((d) => (
            <div key={d.name} className="flex items-center gap-4">
              <span className="w-28 text-[14px] font-medium shrink-0">{d.name}</span>
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-2 flex-1 rounded-sm ${d.score !== null && n <= d.score ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </div>
              <span className="w-8 text-right font-display font-semibold text-primary">
                {d.score === null ? '—' : d.score}
              </span>
              {d.quote ? (
                <span className="flex-1 min-w-0 text-[12px] text-muted-foreground bg-primary-soft border-l-[3px] border-primary pl-2 pr-2 py-1 italic truncate">
                  「{d.quote}」
                </span>
              ) : (
                <span className="flex-1 text-[12px] text-neutral">{t('report.notExamined')}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 优势 / 劣势 */}
      <section className="grid grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <h2 className="font-medium mb-3 text-success">{t('report.strength')}</h2>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-[14px] leading-relaxed">
                {s.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <h2 className="font-medium mb-3 text-danger">{t('report.weakness')}</h2>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-[14px] leading-relaxed">
                {w.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 提升建议 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <h2 className="font-medium mb-3">{t('report.suggestion')}</h2>
        <ol className="space-y-2 list-decimal list-inside">
          {report.suggestions.map((s) => (
            <li key={s} className="text-[14px] leading-relaxed">
              {s}
            </li>
          ))}
        </ol>
      </section>

      {/* STAR 分析 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <h2 className="font-medium mb-4">{t('report.star')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <StarCell label={t('report.situation')} text={report.star.situation} />
          <StarCell label={t('report.task')} text={report.star.task} />
          <StarCell label={t('report.action')} text={report.star.action} />
          <StarCell label={t('report.result')} text={report.star.result} />
        </div>
      </section>

      {/* 通用软素质 */}
      <section className="grid grid-cols-3 gap-6">
        {report.soft_skills.map((s) => (
          <div key={s.name} className="bg-surface border border-border rounded-card p-5 shadow-card">
            <div className="text-sm text-muted-foreground mb-2">
              {t(SOFT_SKILL_KEYS[s.name] ?? s.name)}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-primary">{s.score}</span>
              <span className="text-[12px] text-muted-foreground">/ 5</span>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
