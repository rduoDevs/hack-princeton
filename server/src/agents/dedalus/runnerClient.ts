import { DedalusRunnerConfig } from './runnerConfig'
import { GeminiAgentConfig } from './geminiAgentConfig'

export interface RunnerRequest {
  prompt: string
  systemPrompt?: string
  agentConfig: GeminiAgentConfig
}

export interface RunnerResponse {
  output: string       // raw JSON string from the agent
  provider: 'dedalus' | 'direct_gemini'
  latencyMs: number
}

/**
 * Calls the Dedalus Runner API to execute a Gemini agent turn.
 * Falls back to returning null so the caller can use direct Gemini.
 */
export async function callDedalusRunner(
  runnerCfg: DedalusRunnerConfig,
  req: RunnerRequest,
): Promise<RunnerResponse | null> {
  if (!runnerCfg.apiKey) return null

  const url = `${runnerCfg.baseUrl}/run`
  const t0 = Date.now()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), runnerCfg.timeoutMs)

    const body = {
      agent_type: runnerCfg.agentType,
      model: runnerCfg.model,
      temperature: runnerCfg.temperature,
      max_output_tokens: runnerCfg.maxOutputTokens,
      response_mime_type: req.agentConfig.responseMimeType,
      response_schema: req.agentConfig.responseSchema,
      system_prompt: req.systemPrompt ?? '',
      prompt: req.prompt,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runnerCfg.apiKey}`,
        'X-Agent-Type': 'gemini',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!response.ok) {
      console.warn(`[DedalusRunner] HTTP ${response.status}: ${await response.text()}`)
      return null
    }

    const data = await response.json() as { output?: string; content?: string; text?: string }
    const output = data.output ?? data.content ?? data.text ?? ''
    if (!output) return null

    return { output, provider: 'dedalus', latencyMs: Date.now() - t0 }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('[DedalusRunner] call failed:', err?.message ?? err)
    }
    return null
  }
}
