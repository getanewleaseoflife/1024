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
  hits: number
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
  rounds: string[]
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

export interface ReviewItem {
  dimension: string
  level: number
  quote: string
  anchor: string
  key_points: string[]
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
  history_id?: number | null
  voice_metrics?: VoiceMetrics
  review?: ReviewItem[]
  dialogues?: { role: string; text: string }[]
}

export interface HistoryItem {
  id: number
  position_name: string
  persona_id: string
  match_score: number
  created_at: string
}

export interface AuthUser {
  id: number
  username: string
}

export interface HistoryStats {
  count: number
  avg_match_score: number
  trend: { match_score: number; created_at: string }[]
  weakest_dimensions: { name: string; avg: number }[]
}

export interface VoiceMetrics {
  avg_speed?: number
  pause_count?: number
  avg_volume?: number
  volume_label?: string
}
