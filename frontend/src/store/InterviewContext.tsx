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
}

interface InterviewContextValue {
  state: InterviewState
  setPosition: (id: string, name: string) => void
  setPersona: (id: string) => void
  setResume: (text: string, profile: ResumeProfile, gaps: GapItem[]) => void
  addEvidence: (evidence: Evidence) => void
  resetEvidence: () => void
  setFastMode: (fastMode: boolean) => void
}

const defaultState: InterviewState = {
  positionId: 'ai_algorithm',
  positionName: 'AI 算法工程师',
  personaId: 'rigorous',
  resumeText: '',
  profile: null,
  gaps: [],
  evidence: [],
  fastMode: false,
}

const InterviewContext = createContext<InterviewContextValue | null>(null)

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InterviewState>(defaultState)

  const value = useMemo<InterviewContextValue>(
    () => ({
      state,
      setPosition: (id, name) => setState((s) => ({ ...s, positionId: id, positionName: name })),
      setPersona: (id) => setState((s) => ({ ...s, personaId: id })),
      setResume: (text, profile, gaps) =>
        setState((s) => ({ ...s, resumeText: text, profile, gaps })),
      addEvidence: (evidence) => setState((s) => ({ ...s, evidence: [...s.evidence, evidence] })),
      resetEvidence: () => setState((s) => ({ ...s, evidence: [] })),
      setFastMode: (fastMode) => setState((s) => ({ ...s, fastMode })),
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
