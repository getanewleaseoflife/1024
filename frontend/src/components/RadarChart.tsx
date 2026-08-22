import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export interface RadarItem {
  name: string
  /** null = 待考察（无证据，雷达图置 0，数据表标注「待考察」） */
  value: number | null
}

interface RadarChartProps {
  indicators: RadarItem[]
  max?: number
}

/**
 * 能力雷达图：ECharts setOption 驱动。
 * 视觉规格见 docs/DESIGN.md §5 —— 单数据集 #0369A1 20% 填充 + 顶点数值标签。
 */
export function RadarChart({ indicators, max = 5 }: RadarChartProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)

    chart.setOption({
      tooltip: { trigger: 'item' },
      radar: {
        indicator: indicators.map((i) => ({ name: i.name, max })),
        radius: '65%',
        axisName: { color: '#475569', fontSize: 13 },
        splitArea: { areaStyle: { color: ['#FFFFFF', '#F0F9FF'] } },
        splitLine: { lineStyle: { color: '#BAE6FD' } },
        axisLine: { lineStyle: { color: '#BAE6FD' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: indicators.map((i) => i.value ?? 0),
              name: '能力评估',
              symbol: 'circle',
              symbolSize: 6,
              lineStyle: { color: '#0369A1', width: 2 },
              itemStyle: { color: '#0369A1' },
              areaStyle: { color: 'rgba(3,105,161,0.2)' },
              label: { show: true, color: '#0369A1', fontSize: 12 },
            },
          ],
        },
      ],
    })

    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [indicators, max])

  return <div ref={ref} style={{ width: '100%', height: 360 }} />
}
