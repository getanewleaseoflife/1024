import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPost } from '../api/client'
import type { Position } from '../api/types'

interface OptimizeResult {
  match_rate: number
  gaps: string[]
  star_suggestions: { original: string; suggestion: string }[]
}

export function ResumeOptimize() {
  const { t } = useTranslation()
  const [positions, setPositions] = useState<Position[]>([])
  const [positionId, setPositionId] = useState('')
  const [resume, setResume] = useState('')
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    apiGet<Position[]>('/positions')
      .then((p) => {
        setPositions(p)
        if (p.length) setPositionId(p[0].id)
      })
      .catch(() => {})
  }, [])

  const run = async () => {
    if (!resume.trim() || !positionId) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const r = await apiPost<OptimizeResult>('/coach/resume-optimize', {
        resume_text: resume,
        position_id: positionId,
      })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resumeOptimize.failed'))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      // 剪贴板不可用时忽略
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-5 py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('resumeOptimize.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('resumeOptimize.desc')}</p>
      </div>

      <section className="bg-surface border border-border rounded-card p-6 shadow-card space-y-4">
        <div>
          <label htmlFor="optPosition" className="block text-sm font-medium mb-1.5">
            {t('resumeOptimize.position')}
          </label>
          <select
            id="optPosition"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="optResume" className="block text-sm font-medium mb-1.5">
            {t('resumeOptimize.resume')}
          </label>
          <textarea
            id="optResume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={12}
            placeholder={t('resumeOptimize.placeholder')}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <button
          onClick={run}
          disabled={busy || !resume.trim() || !positionId}
          className="h-10 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? t('resumeOptimize.running') : t('resumeOptimize.run')}
        </button>
      </section>

      {result && (
        <section className="space-y-6">
          {/* 匹配度 */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{t('resumeOptimize.matchRate')}</span>
              <span className="font-display text-3xl font-bold text-primary">
                {result.match_rate}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${result.match_rate}%` }}
              />
            </div>
          </div>

          {/* 能力缺口 */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-card">
            <h2 className="font-medium mb-3">{t('resumeOptimize.gapTitle')}</h2>
            <ul className="space-y-2">
              {result.gaps.map((g, i) => (
                <li key={i} className="text-[14px] leading-relaxed">
                  • {g}
                </li>
              ))}
            </ul>
          </div>

          {/* STAR 改写建议 */}
          <div className="bg-surface border border-border rounded-card p-6 shadow-card">
            <h2 className="font-medium mb-3">{t('resumeOptimize.starTitle')}</h2>
            <div className="space-y-3">
              {result.star_suggestions.map((s, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <div className="text-[12px] text-muted-foreground mb-1">{s.original}</div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] leading-relaxed text-foreground">{s.suggestion}</p>
                    <button
                      onClick={() => copy(s.suggestion)}
                      className="shrink-0 text-[12px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary transition"
                    >
                      {copied === s.suggestion
                        ? t('resumeOptimize.copied')
                        : t('resumeOptimize.copy')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
