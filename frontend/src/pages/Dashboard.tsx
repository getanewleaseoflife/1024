import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, FileText, Rocket } from 'lucide-react'
import * as echarts from 'echarts'
import { apiGet } from '../api/client'
import type { HistoryItem, HistoryStats } from '../api/types'
import { getUserId } from '../api/user'
import { useAuth } from '../store/AuthContext'

export function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [stats, setStats] = useState<HistoryStats | null>(null)
  const trendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = getUserId()
    apiGet<HistoryItem[]>(`/history?user_id=${uid}`)
      .then(setHistory)
      .catch(() => setHistory([]))
    apiGet<HistoryStats>(`/history/stats?user_id=${uid}`)
      .then(setStats)
      .catch(() => setStats(null))
  }, [user])

  useEffect(() => {
    if (!trendRef.current || !stats || stats.trend.length < 2) return
    const chart = echarts.init(trendRef.current)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 24, bottom: 30 },
      xAxis: {
        type: 'category',
        data: stats.trend.map((p) => p.created_at.slice(5, 16)),
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#64748b' } },
      series: [
        {
          type: 'line',
          data: stats.trend.map((p) => p.match_score),
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: '#1E3A5F', width: 2 },
          itemStyle: { color: '#1E3A5F' },
          areaStyle: { color: 'rgba(30,58,95,0.15)' },
        },
      ],
    })
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [stats])

  const hasHistory = history.length > 0

  return (
    <main className="max-w-6xl mx-auto px-5 py-10 space-y-8">
      {/* 欢迎区 */}
      <section className="bg-surface border border-border rounded-card p-8 shadow-card flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {user ? t('dashboard.welcome', { name: user.username }) : t('dashboard.welcomeGuest')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/resume-optimize')}
            className="h-11 px-5 rounded-lg text-sm font-medium border border-border text-foreground hover:border-primary hover:text-primary transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {t('dashboard.resumeOptimize')}
          </button>
          <button
            onClick={() => navigate('/practice')}
            className="h-11 px-5 rounded-lg text-sm font-medium border border-border text-foreground hover:border-primary hover:text-primary transition flex items-center gap-2"
          >
            <Dumbbell className="w-4 h-4" />
            {t('dashboard.practice')}
          </button>
          <button
            onClick={() => navigate('/position')}
            className="h-11 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            {t('dashboard.start')}
          </button>
        </div>
      </section>

      {/* 统计卡 */}
      <section className="grid grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.count')}</div>
          <div className="font-display text-4xl font-bold text-primary mt-2 tabular-nums">
            {stats?.count ?? history.length}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.avgMatch')}</div>
          <div className="font-display text-4xl font-bold text-primary mt-2 tabular-nums">
            {stats?.avg_match_score ?? 0}
            <span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <div className="text-sm text-muted-foreground">{t('dashboard.stats.weakest')}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats?.weakest_dimensions.length ? (
              stats.weakest_dimensions.map((w) => (
                <span
                  key={w.name}
                  className="text-[12px] text-warning px-2 py-0.5 rounded-full bg-warning-bg"
                >
                  {w.name} {w.avg}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </section>

      {/* 趋势 + 最近面试 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <h2 className="font-medium mb-2">{t('dashboard.stats.trend')}</h2>
          {stats && stats.trend.length >= 2 ? (
            <div ref={trendRef} style={{ width: '100%', height: 220 }} />
          ) : (
            <p className="text-[13px] text-muted-foreground py-12 text-center">
              {t('dashboard.stats.noTrend')}
            </p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">{t('dashboard.recent')}</h2>
            {hasHistory && (
              <button
                onClick={() => navigate('/history')}
                className="text-[13px] text-primary hover:underline"
              >
                {t('dashboard.viewAll')}
              </button>
            )}
          </div>
          {hasHistory ? (
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  onClick={() => navigate(`/report?history_id=${h.id}`)}
                  className="w-full flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3 hover:border-primary transition text-left"
                >
                  <div>
                    <span className="text-sm font-medium">{h.position_name}</span>
                    <span className="text-[12px] text-muted-foreground ml-3">{h.created_at}</span>
                  </div>
                  <span className="text-sm text-primary font-semibold">{h.match_score}%</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground py-12 text-center">
              {t('dashboard.empty')}
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
