import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiGet } from '../api/client'
import type { HistoryItem } from '../api/types'
import { getUserId } from '../api/user'

export function History() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<HistoryItem[]>(`/history?user_id=${getUserId()}`)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">{t('history.title')}</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('position.loading')}</p>
      ) : history.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-10 text-center shadow-card">
          <p className="text-muted-foreground">{t('history.empty')}</p>
          <button
            onClick={() => navigate('/position')}
            className="mt-4 h-10 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition"
          >
            {t('dashboard.start')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between bg-surface border border-border rounded-card px-5 py-4 shadow-card hover:border-primary transition"
            >
              <button
                onClick={() => navigate(`/report?history_id=${h.id}`)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <div>
                  <span className="text-sm font-medium">{h.position_name}</span>
                  <span className="text-[12px] text-muted-foreground ml-3">{h.created_at}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-primary font-semibold">{h.match_score}%</span>
                  <span className="text-[13px] text-primary">{t('history.view')} →</span>
                </div>
              </button>
              <a
                href={`/api/history/${h.id}/pdf`}
                className="ml-4 h-8 px-3 rounded-md border border-border text-[12px] text-muted-foreground hover:text-primary hover:border-primary transition flex items-center shrink-0"
              >
                {t('report.downloadPdf')}
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
