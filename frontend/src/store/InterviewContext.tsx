import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Evidence, GapItem, ResumeProfile } from '../api/types'

interface InterviewState {
  positionId: string
  positionName: string
  personaId: string
  resumeText: string
  profile: ResumeProfile | null
  gaps: GapItem[]
  evidence: Evidence[]
  fastMode: boolean
  interviewDone: boolean
  avatar: string
  avatarEnabled: boolean
  readAloud: boolean
}

interface InterviewContextValue {
  state: InterviewState
  setPosition: (id: string, name: string) => void
  setPersona: (id: string) => void
  setResume: (text: string, profile: ResumeProfile, gaps: GapItem[]) => void
  addEvidence: (evidence: Evidence) => void
  resetEvidence: () => void
  setFastMode: (fastMode: boolean) => void
  setInterviewDone: (done: boolean) => void
  setAvatar: (avatar: string) => void
  setAvatarEnabled: (enabled: boolean) => void
  setReadAloud: (readAloud: boolean) => void
}

// positionId 初始为空：岗位必须由用户主动选择，无默认值
const defaultState: InterviewState = {
  positionId: '',
  positionName: '',
  personaId: 'rigorous',
  resumeText: '',
  profile: null,
  gaps: [],
  evidence: [],
  fastMode: false,
  interviewDone: false,
  avatar: '',
  avatarEnabled: true,
  readAloud: true,
}

const InterviewContext = createContext<InterviewContextValue | null>(null)

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InterviewState>(defaultState)

  const value = useMemo<InterviewContextValue>(
    () => ({
      state,
      // 改岗位 → 级联重置下游（简历/画像/证据/面试结束）
      setPosition: (id, name) =>
        setState((s) => ({
          ...s,
          positionId: id,
          positionName: name,
          resumeText: '',
          profile: null,
          gaps: [],
          evidence: [],
          interviewDone: false,
        })),
      // 改人格 → 重置证据/面试结束（旧人格面试作废）
      setPersona: (id) =>
        setState((s) => ({ ...s, personaId: id, evidence: [], interviewDone: false })),
      // 改简历 → 重置证据/面试结束
      setResume: (text, profile, gaps) =>
        setState((s) => ({
          ...s,
          resumeText: text,
          profile,
          gaps,
          evidence: [],
          interviewDone: false,
        })),
      addEvidence: (evidence) => setState((s) => ({ ...s, evidence: [...s.evidence, evidence] })),
      resetEvidence: () => setState((s) => ({ ...s, evidence: [] })),
      setFastMode: (fastMode) => setState((s) => ({ ...s, fastMode })),
      setInterviewDone: (done) => setState((s) => ({ ...s, interviewDone: done })),
      setAvatar: (avatar) => setState((s) => ({ ...s, avatar })),
      setAvatarEnabled: (enabled) => setState((s) => ({ ...s, avatarEnabled: enabled })),
      setReadAloud: (readAloud) => setState((s) => ({ ...s, readAloud })),
    }),
    [state],
  )

  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>
}

export function useInterview(): InterviewContextValue {
  const ctx = useContext(InterviewContext)
  if (!ctx) throw new Error('useInterview 必须在 InterviewProvider 内使用')
  return ctx
}
