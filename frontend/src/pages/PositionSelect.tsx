import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiGet } from '../api/client'
import type { HistoryItem, Position } from '../api/types'
import { getUserId } from '../api/user'
import { useInterview } from '../store/InterviewContext'

export function PositionSelect() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setPosition } = useInterview()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])

  useEffect(() => {
    apiGet<Position[]>('/positions')
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false))
    apiGet<HistoryItem[]>(`/history?user_id=${getUserId()}`)
      .then(setHistoryList)
      .catch(() => setHistoryList([]))
  }, [])

  const handleSelect = (p: Position) => {
    setPosition(p.id, p.name)
    navigate('/resume')
  }

  return (
    <main className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">{t('position.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('position.desc')}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('position.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {positions.map((p) => (
            <div
              key={p.id}
              className="bg-surface border border-border rounded-card p-6 shadow-card flex flex-col"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                {p.available ? (
                  <span className="text-[11px] font-medium text-success px-2 py-1 rounded-full bg-success-bg">
                    {t('position.available')}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-neutral px-2 py-1 rounded-full bg-neutral-bg">
                    {t('position.pending')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{p.tagline}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                {p.dimensions.map((d) => (
                  <span
                    key={d}
                    className="text-[12px] text-primary px-2 py-0.5 rounded-full bg-primary-soft"
                  >
                    {d}
                  </span>
                ))}
              </div>

              <button
                disabled={!p.available}
                onClick={() => handleSelect(p)}
                className={`mt-6 w-full h-10 rounded-lg text-sm font-medium transition ${
                  p.available
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {p.available ? t('position.start') : t('position.soon')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 历史记录 */}
      {historyList.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold mb-4">{t('history.title')}</h2>
          <div className="space-y-2">
            {historyList.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3 shadow-card"
              >
                <div>
                  <span className="text-sm font-medium">{h.position_name}</span>
                  <span className="text-[12px] text-muted-foreground ml-3">{h.created_at}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-primary font-semibold">{h.match_score}%</span>
                  <button
                    onClick={() => navigate(`/report?history_id=${h.id}`)}
                    className="text-[13px] text-primary hover:underline"
                  >
                    {t('history.view')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
