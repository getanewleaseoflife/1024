import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AudioLines, Mic, Volume2 } from 'lucide-react'
import { apiPost, streamSSE } from '../api/client'
import type { Evidence, InterviewStart } from '../api/types'
import { useInterview, type DialogLine } from '../store/InterviewContext'
import { InterviewerAvatar, type AvatarStatus } from '../components/InterviewerAvatar'
import { useVoiceEmotion } from '../hooks/useVoiceEmotion'

type Segment = { type: 'text'; text: string } | { type: 'quote'; text: string }

interface Message {
  role: 'interviewer' | 'candidate'
  gesture?: string
  segments: Segment[]
}

interface RoundResult {
  round: number
  persona_id: string
  avg_level: number
  verdict: string
}

/** 各人格默认音色（Edge TTS 中文神经网络语音）。用户可在设置页覆盖。 */
const PERSONA_VOICE: Record<string, string> = {
  friendly: 'zh-CN-XiaoxiaoNeural', // 温柔女声
  rigorous: 'zh-CN-YunxiNeural', // 沉稳男声
  stress: 'zh-CN-YunyangNeural', // 严肃男声
}

function verdictKey(verdict: string): string {
  return verdict === '晋级' ? 'interview.promote' : 'interview.hold'
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  start: () => void
}

interface SpeechResultEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: { isFinal: boolean; [index: number]: { transcript: string } }
  }
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** 解析追问原文：识别开头的肢体语言描写（…）作为 gesture。 */
function parseFollowup(text: string): Message {
  const m = text.match(/^（[^）]*）/u)
  if (m) {
    return {
      role: 'interviewer',
      gesture: m[0],
      segments: [{ type: 'text', text: text.slice(m[0].length).trim() }],
    }
  }
  return { role: 'interviewer', segments: [{ type: 'text', text }] }
}

/** 去掉肢体语言描写（括号内），避免语音播报念出「合上简历、身体前倾」等舞台指示 */
function stripGestures(text: string): string {
  return text.replace(/（[^）]*）/g, '').trim()
}

function messageText(message: Message): string {
  return message.segments.map((s) => s.text).join('')
}

function MessageBubble({ message, onPlay }: { message: Message; onPlay?: (text: string) => void }) {
  const { t } = useTranslation()
  const isInterviewer = message.role === 'interviewer'
  return (
    <div className={`flex ${isInterviewer ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[78%] px-4 py-3 rounded-card ${
          isInterviewer ? 'bg-surface border border-border' : 'bg-primary-soft'
        }`}
      >
        {message.gesture && (
          <div className="text-[12px] text-muted-foreground italic mb-1">{message.gesture}</div>
        )}
        <div className="text-[15px] leading-[1.7] whitespace-pre-wrap">
          {message.segments.map((seg, i) =>
            seg.type === 'quote' ? (
              <span
                key={i}
                className="bg-primary-soft border-l-[3px] border-primary pl-2 pr-1 italic text-primary"
              >
                「{seg.text}」
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
        {isInterviewer && onPlay && (
          <button
            onClick={() => onPlay(messageText(message))}
            className="mt-2 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition"
            title={t('interview.play')}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {t('interview.play')}
          </button>
        )}
      </div>
    </div>
  )
}

function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
  const { t } = useTranslation()
  return (
    <aside className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="mb-1">
        <h2 className="font-medium text-[15px]">{t('interview.evidenceTitle')}</h2>
        <p className="text-[12px] text-muted-foreground">
          {t('interview.evidenceCount', { count: evidence.length })}
        </p>
      </div>
      {evidence.length === 0 ? (
        <p className="text-[13px] text-muted-foreground mt-4">{t('interview.evidenceEmpty')}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {evidence.map((e, i) => (
            <div key={i} className="rise">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium">{e.dimension}</span>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`w-1.5 h-3 rounded-sm ${n <= e.level ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground truncate" title={e.quote}>
                「{e.quote}」
              </p>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

function EmotionPanel({
  metrics,
}: {
  metrics: { speed: number; pauses: number; volume: number | null }
}) {
  const { t } = useTranslation()
  const volumeLabel =
    metrics.volume === null
      ? ''
      : metrics.volume < 0.03
        ? t('interview.volumeLow')
        : metrics.volume < 0.08
          ? t('interview.volumeMid')
          : t('interview.volumeHigh')
  return (
    <aside className="bg-surface border border-border rounded-card shadow-card p-5">
      <h2 className="font-medium text-[15px] mb-1">{t('interview.voiceTitle')}</h2>
      <p className="text-[12px] text-muted-foreground mb-3">{t('interview.voiceDesc')}</p>
      <div className="space-y-2 text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('interview.speed')}</span>
          <span className="font-medium">
            {metrics.speed} {t('interview.wpm')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('interview.pauses')}</span>
          <span className="font-medium">{metrics.pauses}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('interview.volume')}</span>
          <span className="font-medium">{volumeLabel || '—'}</span>
        </div>
      </div>
    </aside>
  )
}

export function Interview() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { state, addEvidence, resetEvidence, setInterviewDone, setVoiceMetrics, setDialogues } =
    useInterview()
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streamText, setStreamText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const [closed, setClosed] = useState(false)
  const [listening, setListening] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('idle')
  const [rounds, setRounds] = useState<string[]>([])
  const [roundVerdicts, setRoundVerdicts] = useState<RoundResult[]>([])
  const [voiceMode, setVoiceMode] = useState(false)
  const [liveCaption, setLiveCaption] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)
  const closedRef = useRef(false)

  const emotion = useVoiceEmotion(voiceMode)

  const stopAudio = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
  }

  const handleStop = () => {
    stopAudio()
    setAvatarStatus('idle')
  }

  const handlePause = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      setAvatarStatus('paused')
    }
  }

  const handleResume = () => {
    const audio = audioRef.current
    if (audio) {
      setAvatarStatus('speaking')
      audio.play().catch(() => setAvatarStatus('idle'))
    }
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    resetEvidence()
    apiPost<InterviewStart>('/interview/start', {
      position_id: state.positionId,
      persona_id: state.personaId,
      resume_text: state.resumeText,
      fast_mode: state.fastMode,
      gaps: state.gaps,
    })
      .then((res) => {
        setSessionId(res.session_id)
        setRounds(res.rounds ?? [])
        setMessages([{ role: 'interviewer', segments: [{ type: 'text', text: res.opening }] }])
        if (state.readAloud && state.avatarEnabled && res.opening.trim()) {
          void playTTS(res.opening)
        }
      })
      .catch((e) =>
        setMessages([
          {
            role: 'interviewer',
            segments: [{ type: 'text', text: t('interview.startFailed', { error: String(e) }) }],
          },
        ]),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 卸载时停掉未播完的音频，避免离开面试页后仍有声音
  useEffect(() => {
    return () => stopAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = async (answerText?: string) => {
    const answer = (answerText ?? input).trim()
    if (!answer || !sessionId || thinking || closed) return
    if (!answerText) setInput('')
    setMessages((prev) => [
      ...prev,
      { role: 'candidate', segments: [{ type: 'text', text: answer }] },
    ])
    setThinking(true)
    setStreamText('')
    stopAudio()
    if (state.avatarEnabled) setAvatarStatus('thinking')

    let full = ''
    let isClosed = false
    let failed = false
    try {
      await streamSSE('/interview/answer', { session_id: sessionId, answer }, (event) => {
        if (event.type === 'evidence' && event.evidence) {
          addEvidence(event.evidence as Evidence)
        } else if (event.type === 'delta' && typeof event.content === 'string') {
          full += event.content
          setStreamText(full)
        } else if (event.type === 'round' && event.result) {
          setRoundVerdicts((prev) => [...prev, event.result as RoundResult])
        } else if (event.type === 'done') {
          isClosed = Boolean(event.closed)
          if (isClosed) setInterviewDone(true)
        }
      })
    } catch (e) {
      full = `（${String(e)}）`
      failed = true
    }

    if (full) setMessages((prev) => [...prev, parseFollowup(full)])
    if (full && !failed && state.readAloud && state.avatarEnabled) {
      void playTTS(full)
    } else if (state.avatarEnabled) {
      setAvatarStatus('idle')
    }
    setStreamText('')
    setThinking(false)
    if (isClosed) {
      setClosed(true)
      closedRef.current = true
      setVoiceMetrics(emotion.summary())
      // 保存整场对话逐字稿，供报告「逐题复盘 / 面试回放」使用
      const all: DialogLine[] = [
        ...messages.map((m) => ({ role: m.role, text: messageText(m) })),
        { role: 'candidate', text: answer },
      ]
      if (full && !failed) all.push({ role: 'interviewer', text: messageText(parseFollowup(full)) })
      setDialogues(all)
    }
  }

  const playTTS = async (text: string) => {
    stopAudio()
    const avatarOn = state.avatarEnabled
    const spoken = stripGestures(text)
    if (!spoken) {
      if (avatarOn) setAvatarStatus('idle')
      return
    }
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spoken,
          voice: state.ttsVoice || PERSONA_VOICE[state.personaId] || 'zh-CN-XiaoxiaoNeural',
        }),
      })
      if (!res.ok) {
        if (avatarOn) setAvatarStatus('idle')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      if (avatarOn) setAvatarStatus('speaking')
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null
        if (avatarOn) setAvatarStatus('idle')
        if (voiceMode && !closedRef.current) startASR()
      }
      await audio.play().catch(() => {
        if (audioRef.current === audio) audioRef.current = null
        if (avatarOn) setAvatarStatus('idle')
      })
    } catch {
      // 语音播报失败不阻断主链路
      if (avatarOn) setAvatarStatus('idle')
    }
  }

  const startASR = () => {
    const Recognition = getSpeechRecognition()
    if (!Recognition || closed || thinking) return
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.onspeechstart = () => emotion.onSpeakStart()
    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      if (interim) setLiveCaption(interim)
      if (final.trim()) {
        setLiveCaption('')
        emotion.noteChars(final.length)
        void handleSend(final)
      }
    }
    recognition.onspeechend = () => emotion.onSpeakEnd()
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
  }

  return (
    <main className="max-w-6xl mx-auto px-5 py-6">
      <div className={`grid gap-6 ${state.avatarEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {/* 虚拟面试官（左侧，可选显隐） */}
        {state.avatarEnabled && (
          <aside className="col-span-1 self-start">
            <InterviewerAvatar
              personaId={state.personaId}
              status={avatarStatus}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
            />
          </aside>
        )}
        {/* 对话主区 */}
        <section className="col-span-2 flex flex-col">
          <div className="bg-surface border border-border rounded-card shadow-card p-5">
            {state.avatar && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <img
                  src={state.avatar}
                  alt="candidate"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-medium">
                    {state.profile?.name || t('profile.unnamed')}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{state.positionName}</div>
                </div>
              </div>
            )}
            {rounds.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary-soft">
                  {t('interview.round', {
                    current: Math.min(roundVerdicts.length + 1, rounds.length),
                    total: rounds.length,
                  })}
                </span>
                {roundVerdicts.length > 0 && (
                  <span className="text-[12px] text-muted-foreground">
                    {t('interview.roundResult', {
                      round: roundVerdicts[roundVerdicts.length - 1].round,
                      verdict: t(verdictKey(roundVerdicts[roundVerdicts.length - 1].verdict)),
                      avg: roundVerdicts[roundVerdicts.length - 1].avg_level,
                    })}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-4 min-h-[400px]">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} onPlay={playTTS} />
              ))}
              {streamText && (
                <div className="flex justify-start">
                  <div className="max-w-[78%] px-4 py-3 rounded-card bg-surface border border-border">
                    <span className="text-[15px] leading-[1.7] whitespace-pre-wrap">
                      {streamText}
                      <span className="cursor-blink"></span>
                    </span>
                  </div>
                </div>
              )}
              {listening && liveCaption && (
                <div className="flex justify-end">
                  <div className="max-w-[78%] px-4 py-3 rounded-card bg-primary-soft text-[14px] text-muted-foreground flex items-center gap-2">
                    <AudioLines className="w-4 h-4 shrink-0" />
                    {liveCaption}
                  </div>
                </div>
              )}
              {thinking && !streamText && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border rounded-card px-4 py-3">
                    <span className="thinking-dot">●</span>
                    <span className="thinking-dot ml-1">●</span>
                    <span className="thinking-dot ml-1">●</span>
                    <span className="text-[12px] text-muted-foreground ml-2">
                      {t('interview.thinking')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部：输入条 或 结束按钮 */}
          <div className="mt-4 flex items-center gap-3">
            {closed ? (
              <button
                onClick={() => navigate('/report')}
                className="w-full h-11 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover transition"
              >
                {t('interview.finish')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setVoiceMode((v) => !v)}
                  className={`h-11 px-3 rounded-lg border text-[12px] font-medium transition ${
                    voiceMode
                      ? 'bg-primary-soft border-primary text-primary'
                      : 'bg-surface border-border text-muted-foreground hover:text-primary'
                  }`}
                  title={t('interview.voiceMode')}
                >
                  {t('interview.voiceMode')}
                </button>
                <button
                  onClick={startASR}
                  className={`h-11 px-3 rounded-lg border text-sm transition flex items-center gap-1.5 ${
                    listening
                      ? 'bg-danger-bg border-danger text-danger'
                      : 'bg-surface border-border text-muted-foreground hover:text-primary'
                  }`}
                  title={t('interview.voiceInput')}
                >
                  <Mic className="w-5 h-5" />
                  {listening && <span className="text-[12px]">{t('interview.listening')}</span>}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('interview.placeholder')}
                  className="flex-1 h-11 rounded-lg border border-border bg-surface px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || thinking}
                  className="h-11 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {t('interview.send')}
                </button>
              </>
            )}
          </div>
        </section>

        {/* L3 证据侧栏 + 语音情绪 */}
        <section className="col-span-1 space-y-4">
          <EvidencePanel evidence={state.evidence} />
          {voiceMode && <EmotionPanel metrics={emotion.metrics} />}
        </section>
      </div>
    </main>
  )
}
