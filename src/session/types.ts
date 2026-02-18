export type TargetingStrategy =
  | "user_specified"
  | "new_session"
  | "active_session"
  | "topic_match"
  | "most_recent"
  | "create_new"

export interface TargetingResult {
  sessionId: string | null
  strategy: TargetingStrategy
  confidence: number
  needsCreate: boolean
}

export interface TargetingOptions {
  sessionId?: string
  newSession?: boolean
  titleKeyword?: string
  strategyHint?: TargetingStrategy
}
