import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../api/client'
import type { ResumeParseResult } from '../api/types'
import { useInterview } from '../store/InterviewContext'

export function ResumeInput() {
  const navigate = useNavigate()
  const { state, setResume } = useInterview()
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setParsing(true)
    setError('')
    try {
      const result = await apiPost<ResumeParseResult>('/resume/parse', {
        resume_text: text,
        position_id: state.positionId,
      })
      setResume(text, result.profile, result.gaps)
      navigate('/profile')
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析失败，请重试')
    } finally {
      setParsing(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">简历输入</h1>
        <p className="text-muted-foreground mt-2">
          粘贴简历文本，系统将提取能力标签并构建候选人画像（目标岗位：{state.positionName}）。
        </p>
      </div>

      <div className="bg-surface border border-border rounded-card p-6 shadow-card">
        <label htmlFor="resume" className="block text-sm font-medium mb-2">
          简历文本
        </label>
        <textarea
          id="resume"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="在此粘贴简历文本，例如：教育背景、技能栈、项目经历、实习经历、证书奖项…"
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
        />
        <p className="text-[12px] text-muted-foreground mt-2 flex items-center gap-1.5">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.6}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          简历原文仅本次会话内使用，不上传、不落盘
        </p>

        {error && <p className="text-[13px] text-destructive mt-2">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleParse}
            disabled={!text.trim() || parsing}
            className="h-10 px-6 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {parsing ? '解析中…' : '解析简历'}
          </button>
          <span className="text-[12px] text-muted-foreground">PDF 上传（增强项，后续支持）</span>
        </div>
      </div>
    </main>
  )
}
