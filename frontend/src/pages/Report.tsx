import { useEffect, useState } from 'react'
import { apiPost } from '../api/client'
import type { Report as ReportData } from '../api/types'
import { useInterview } from '../store/InterviewContext'
import { RadarChart } from '../components/RadarChart'

function StarCell({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-primary mb-1">{label}</div>
      <p className="text-[13px] leading-relaxed">{text}</p>
    </div>
  )
}

function matchLevel(score: number): { label: string; chip: string } {
  if (score >= 85) return { label: '优秀', chip: 'text-success bg-success-bg' }
  if (score >= 70) return { label: '良好', chip: 'text-primary bg-primary-soft' }
  if (score >= 60) return { label: '待提升', chip: 'text-warning bg-warning-bg' }
  return { label: '需加强', chip: 'text-danger bg-danger-bg' }
}

export function Report() {
  const { state } = useInterview()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiPost<ReportData>('/report/generate', {
      session_id: '',
      position_id: state.positionId,
      evidence: state.evidence,
      dialogues: [],
    })
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <main className="max-w-5xl mx-auto px-5 py-10 text-muted-foreground">报告生成中…</main>
  }

  if (!report) {
    return (
      <main className="max-w-5xl mx-auto px-5 py-10 text-muted-foreground">
        无法生成报告，请先完成面试。
      </main>
    )
  }

  const level = matchLevel(report.match_score)

  return (
    <main className="max-w-5xl mx-auto px-5 py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">评估报告</h1>
        <p className="text-muted-foreground mt-2">基于本次面试的客观能力评估与提升建议。</p>
      </div>

      {/* 综合匹配度 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">综合匹配度</div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold text-primary">
              {report.match_score}%
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${level.chip}`}>
              {level.label}
            </span>
          </div>
        </div>
        <div className="text-right text-[13px] text-muted-foreground">
          <div>{report.position_name}</div>
          <div>
            {state.personaId === 'rigorous'
              ? '严谨型'
              : state.personaId === 'friendly'
                ? '随和型'
                : '压力型'}
            面试官
          </div>
        </div>
      </section>

      {/* 能力雷达图 */}
      <section className="bg-surface border border-border rounded-card p-6 shadow-card">
        <h2 className="font-medium mb-4">能力雷达图</h2>
        <RadarChart indicators={report.radar} />
        <table className="mt-4 w-full text-[13px]" role="table">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 font-medium">维度</th>
              <th className="py-2 font-medium">得分</th>
            </tr>
          </thead>
          <tbody>
            {report.radar.map((r) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="py-2">{r.name}</td>
                <td className="py-2">
                  {r.value === null ? (
                    <span className="text-neutral">待考察</span>
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
        <h2 className="font-medium mb-4">分维度得分</h2>
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
                <span className="flex-1 text-[12px] text-neutral">待考察</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 优势 / 劣势 */}
      <section className="grid grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <h2 className="font-medium mb-3 text-success">优势</h2>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-[14px] leading-relaxed">
                {s.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <h2 className="font-medium mb-3 text-danger">待提升</h2>
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
        <h2 className="font-medium mb-3">提升建议</h2>
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
        <h2 className="font-medium mb-4">STAR 项目分析</h2>
        <div className="grid grid-cols-2 gap-4">
          <StarCell label="情境 Situation" text={report.star.situation} />
          <StarCell label="任务 Task" text={report.star.task} />
          <StarCell label="行动 Action" text={report.star.action} />
          <StarCell label="结果 Result" text={report.star.result} />
        </div>
      </section>

      {/* 通用软素质 */}
      <section className="grid grid-cols-3 gap-6">
        {report.soft_skills.map((s) => (
          <div
            key={s.name}
            className="bg-surface border border-border rounded-card p-5 shadow-card"
          >
            <div className="text-sm text-muted-foreground mb-2">{s.name}</div>
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
