export interface DedalusRunnerConfig {
  apiKey: string
  baseUrl: string
  timeoutMs: number
  agentType: 'gemini'
  model: string
  temperature: number
  maxOutputTokens: number
}

export function buildRunnerConfig(overrides: Partial<DedalusRunnerConfig> = {}): DedalusRunnerConfig {
  return {
    apiKey: process.env.DEDALUS_API_KEY ?? '',
    baseUrl: 'https://api.dedalus.ai/v1',
    timeoutMs: 25_000,
    agentType: 'gemini',
    model: 'gemini-2.0-flash',
    temperature: 0.9,
    maxOutputTokens: 2048,
    ...overrides,
  }
}
