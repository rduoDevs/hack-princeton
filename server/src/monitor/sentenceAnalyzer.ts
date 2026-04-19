import { SentenceAnnotation } from '../game/types'
import { buildSentenceAnalyzerPrompt } from './prompts'
import { cerebrasChat } from '../agents/cerebrasClient'

/** Optional sentence-level CoT analyzer. Only call on flagged turns. */
export class SentenceAnalyzer {
  private apiKey: string | null

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? null
  }

  async analyze(input: {
    playerId: string
    playerName: string
    round: number
    reasoningTrace: string
    vote: string | null
    donate: boolean
    sacrifice: boolean
  }): Promise<SentenceAnnotation[]> {
    if (!this.apiKey || !input.reasoningTrace) return []

    const prompt = buildSentenceAnalyzerPrompt({
      playerName:     input.playerName,
      round:          input.round,
      reasoningTrace: input.reasoningTrace,
      action:         { vote: input.vote, donate: input.donate, sacrifice: input.sacrifice },
    })

    try {
      const text   = await cerebrasChat(this.apiKey, prompt, { temperature: 0.2, maxTokens: 500, model: 'small' })
      const parsed = JSON.parse(text)
      return (parsed.sentences ?? []) as SentenceAnnotation[]
    } catch (err) {
      console.error('[SentenceAnalyzer] error:', err)
      return []
    }
  }
}
