import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api/client'
import type { Position } from '../api/types'
import { useInterview } from '../store/InterviewContext'

export function PositionSelect() {
  const navigate = useNavigate()
  const { setPosition } = useInterview()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Position[]>('/positions')
      .then(setPositions)
      .catch(() => setPositions([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (p: Position) => {
    setPosition(p.id, p.name)
    navigate('/resume')
  }

  return (
    <main className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">选择目标岗位</h1>
        <p className="text-muted-foreground mt-2">
          选择一个岗位，AI 面试官将基于该岗位的胜任力模型进行多轮面试与能力评估。
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">加载岗位中…</p>
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
                    可用
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-neutral px-2 py-1 rounded-full bg-neutral-bg">
                    待扩展
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
                {p.available ? '开始面试' : '即将支持'}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
