import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceMetrics } from '../api/types'

interface LiveMetrics {
  speed: number
  pauses: number
  volume: number | null
}

/**
 * 语音情绪分析：语速（转写字数/说话时长）、停顿（断句次数）、音量（Web Audio RMS）。
 * 音量依赖 getUserMedia，失败则降级为 null（只留语速/停顿），不影响语音主链路。
 */
export function useVoiceEmotion(enabled: boolean) {
  const [metrics, setMetrics] = useState<LiveMetrics>({ speed: 0, pauses: 0, volume: null })
  const totalCharsRef = useRef(0)
  const totalSpeakMsRef = useRef(0)
  const pausesRef = useRef(0)
  const speakStartRef = useRef(0)
  const volumeRef = useRef<number | null>(null)
  const volumeSumRef = useRef(0)
  const volumeCountRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef(0)
  const activeRef = useRef(false)

  const sample = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser || !activeRef.current) return
    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    volumeRef.current = rms
    volumeSumRef.current += rms
    volumeCountRef.current += 1
    setMetrics((m) => ({ ...m, volume: rms }))
    rafRef.current = requestAnimationFrame(sample)
  }, [])

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    activeRef.current = true
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        ctx.createMediaStreamSource(stream).connect(analyser)
        analyserRef.current = analyser
        rafRef.current = requestAnimationFrame(sample)
      } catch {
        // 麦克风不可用：音量降级为 null
      }
    }
    void setup()
    return () => {
      disposed = true
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      void audioCtxRef.current?.close()
      streamRef.current = null
      analyserRef.current = null
      audioCtxRef.current = null
    }
  }, [enabled, sample])

  const onSpeakStart = useCallback(() => {
    speakStartRef.current = Date.now()
  }, [])

  const onSpeakEnd = useCallback(() => {
    pausesRef.current += 1
    totalSpeakMsRef.current += Date.now() - speakStartRef.current
    const durMin = totalSpeakMsRef.current / 60000
    const speed = durMin > 0 ? Math.round(totalCharsRef.current / durMin) : 0
    setMetrics((m) => ({ ...m, speed, pauses: pausesRef.current }))
  }, [])

  const noteChars = useCallback((n: number) => {
    totalCharsRef.current += n
  }, [])

  const reset = useCallback(() => {
    totalCharsRef.current = 0
    totalSpeakMsRef.current = 0
    pausesRef.current = 0
    speakStartRef.current = 0
    volumeSumRef.current = 0
    volumeCountRef.current = 0
    setMetrics({ speed: 0, pauses: 0, volume: volumeRef.current })
  }, [])

  const summary = useCallback((): VoiceMetrics => {
    const avg = volumeCountRef.current > 0 ? volumeSumRef.current / volumeCountRef.current : null
    let label = ''
    if (avg !== null) label = avg < 0.03 ? '偏小' : avg < 0.08 ? '适中' : '洪亮'
    return {
      avg_speed: metrics.speed,
      pause_count: Math.max(0, pausesRef.current),
      avg_volume: avg === null ? undefined : Math.round(avg * 1000) / 1000,
      volume_label: label || undefined,
    }
  }, [metrics.speed])

  return { metrics, onSpeakStart, onSpeakEnd, noteChars, reset, summary }
}
