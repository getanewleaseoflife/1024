import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost, streamSSE } from '../api/client'
import type { Evidence, InterviewStart } from '../api/types'
import { useInterview } from '../store/InterviewContext'

type Segment = { type: 'text'; text: string } | { type: 'quote'; text: string }

interface Message {
  role: 'interviewer' | 'candidate'
  gesture?: string
  segments: Segment[]
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

function MessageBubble({ message }: { message: Message }) {
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
      </div>
    </div>
  )
}

function EvidencePanel({ evidence }: { evidence: Evidence[] }) {
  return (
    <aside className="bg-surface border border-border rounded-card shadow-card p-5">
      <div className="mb-1">
        <h2 className="font-medium text-[15px]">能力证据 · 实时累积</h2>
        <p className="text-[12px] text-muted-foreground">已覆盖 {evidence.length} 条证据</p>
      </div>
      {evidence.length === 0 ? (
        <p className="text-[13px] text-muted-foreground mt-4">
          面试开始后，能力证据会在此实时累积。
        </p>
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

export function Interview() {
  const navigate = useNavigate()
  const { state, addEvidence, resetEvidence } = useInterview()
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streamText, setStreamText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [input, setInput] = useState('')
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    resetEvidence()
    apiPost<InterviewStart>('/interview/start', {
      position_id: state.positionId,
      persona_id: state.personaId,
      resume_text: state.resumeText,
    })
      .then((res) => {
        setSessionId(res.session_id)
        setMessages([{ role: 'interviewer', segments: [{ type: 'text', text: res.opening }] }])
      })
      .catch((e) =>
        setMessages([
          { role: 'interviewer', segments: [{ type: 'text', text: `面试启动失败：${e}` }] },
        ]),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = async () => {
    if (!input.trim() || !sessionId || thinking || closed) return
    const answer = input
    setInput('')
    setMessages((prev) => [
      ...prev,
      { role: 'candidate', segments: [{ type: 'text', text: answer }] },
    ])
    setThinking(true)
    setStreamText('')

    let full = ''
    let isClosed = false
    try {
      await streamSSE('/interview/answer', { session_id: sessionId, answer }, (event) => {
        if (event.type === 'evidence' && event.evidence) {
          addEvidence(event.evidence as Evidence)
        } else if (event.type === 'delta' && typeof event.content === 'string') {
          full += event.content
          setStreamText(full)
        } else if (event.type === 'done') {
          isClosed = Boolean(event.closed)
        }
      })
    } catch (e) {
      full = `（系统提示：${e}）`
    }

    if (full) setMessages((prev) => [...prev, parseFollowup(full)])
    setStreamText('')
    setThinking(false)
    if (isClosed) setClosed(true)
  }

  return (
    <main className="max-w-6xl mx-auto px-5 py-6">
      <div className="grid grid-cols-3 gap-6">
        {/* 对话主区 */}
        <section className="col-span-2 flex flex-col">
          <div className="bg-surface border border-border rounded-card shadow-card p-5">
            <div className="space-y-4 min-h-[400px]">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
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
              {thinking && !streamText && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border rounded-card px-4 py-3">
                    <span className="thinking-dot">●</span>
                    <span className="thinking-dot ml-1">●</span>
                    <span className="thinking-dot ml-1">●</span>
                    <span className="text-[12px] text-muted-foreground ml-2">正在思考…</span>
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
                className="w-full h-11 rounded-lg text-sm font-medium bg-accent text-white hover:opacity-90 transition"
              >
                面试结束，查看评估报告 →
              </button>
            ) : (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="输入你的回答…"
                  className="flex-1 h-11 rounded-lg border border-border bg-surface px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || thinking}
                  className="h-11 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  发送
                </button>
              </>
            )}
          </div>
        </section>

        {/* L3 证据侧栏 */}
        <section className="col-span-1">
          <EvidencePanel evidence={state.evidence} />
        </section>
      </div>
    </main>
  )
}
