import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPost } from '../api/client'
import type { Position } from '../api/types'

interface PracticeData {
  dimensions: string[]
  dimension: string
  question: string
  reference: string[]
}

interface GradeResult {
  score: number
  feedback: string
  reference: string
}

export function Practice() {
  const { t } = useTranslation()
  const [positions, setPositions] = useState<Position[]>([])
  const [positionId, setPositionId] = useState('')
  const [data, setData] = useState<PracticeData | null>(null)
  const [answer, setAnswer] = useState('')
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [grading, setGrading] = useState(false)

  const loadQuestion = async (posId: string, dim: string) => {
    const d = await apiGet<PracticeData>(
      `/coach/practice?position_id=${posId}&dimension=${encodeURIComponent(dim)}`,
    )
    setData(d)
    setAnswer('')
    setGrade(null)
  }

  useEffect(() => {
    apiGet<Position[]>('/positions')
      .then((p) => {
        setPositions(p)
        if (p.length) {
          setPositionId(p[0].id)
          loadQuestion(p[0].id, '')
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchDimension = (dim: string) => {
    if (positionId) loadQuestion(positionId, dim)
  }

  const submit = async () => {
    if (!data || !answer.trim()) return
    setGrading(true)
    try {
      const g = await apiPost<GradeResult>('/coach/grade', {
        dimension: data.dimension,
        question: data.question,
        answer,
        reference: data.reference,
      })
      setGrade(g)
    } finally {
      setGrading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('practice.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('practice.desc')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={positionId}
          onChange={(e) => {
            setPositionId(e.target.value)
            loadQuestion(e.target.value, '')
          }}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {data?.dimensions.map((d) => (
          <button
            key={d}
            onClick={() => switchDimension(d)}
            className={`h-9 px-3 rounded-md text-[13px] font-medium border transition ${
              data.dimension === d
                ? 'bg-primary-soft text-primary border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {data && (
        <section className="bg-surface border border-border rounded-card p-6 shadow-card space-y-4">
          <div>
            <div className="text-[12px] text-muted-foreground mb-1">{data.dimension}</div>
            <p className="font-medium text-[15px] leading-relaxed">{data.question}</p>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            placeholder={t('practice.placeholder')}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={grading || !answer.trim()}
              className="h-10 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {grading ? t('practice.grading') : t('practice.submit')}
            </button>
            <button
              onClick={() => loadQuestion(positionId, data.dimension)}
              className="h-10 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:border-primary transition"
            >
              {t('practice.next')}
            </button>
          </div>
        </section>
      )}

      {grade && (
        <section className="bg-surface border border-border rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-4xl font-bold text-primary">{grade.score}</span>
            <span className="text-muted-foreground">/ 5</span>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">{t('practice.feedback')}</div>
            <p className="text-[14px] leading-relaxed">{grade.feedback}</p>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">{t('practice.reference')}</div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">{grade.reference}</p>
          </div>
        </section>
      )}
    </main>
  )
}
