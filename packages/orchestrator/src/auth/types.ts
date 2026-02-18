export interface AuthConfig {
  apiKey: string
  enabled: boolean
}

export interface RateLimitEntry {
  count: number
  windowStart: number
}

export interface AuthResult {
  authorized: boolean
  error?: string
  statusCode?: number
}
