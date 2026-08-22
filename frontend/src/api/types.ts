// 前后端接口契约类型（与后端 schemas 对齐）

export interface Position {
  id: string
  name: string
  tagline: string
  available: boolean
  dimensions: string[]
}

export interface ResumeProfile {
  name: string
  education: string
  skills: string[]
  projects: string[]
  experiences: string[]
}

export interface GapItem {
  dimension: string
  status: 'have' | 'pending' | 'missing'
}

export interface ResumeParseResult {
  profile: ResumeProfile
  gaps: GapItem[]
}

export interface Evidence {
  dimension: string
  level: number
  quote: string
}

export interface InterviewStart {
  session_id: string
  opening: string
  dimensions: string[]
}

export interface RadarItem {
  name: string
  value: number | null
}

export interface DimensionScore {
  name: string
  score: number | null
  quote: string
}

export interface Report {
  position_name: string
  match_score: number
  radar: RadarItem[]
  dimension_scores: DimensionScore[]
  strengths: { text: string; quote: string }[]
  weaknesses: { text: string; quote: string }[]
  suggestions: string[]
  star: { situation: string; task: string; action: string; result: string }
  soft_skills: { name: string; score: number }[]
}
