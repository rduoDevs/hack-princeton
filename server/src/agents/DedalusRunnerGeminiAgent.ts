import { AgentInterface } from './AgentInterface'
import { AIPlayerContext, AITurnOutput } from '../game/types'
import { buildSystemPrompt, buildContextBlock } from './prompts/systemPrompt'
import { MONITOR_AWARE_ADDENDUM } from './prompts/monitorAwarePrompt'
import { cerebrasChat, pickKey } from './cerebrasClient'

// Calculate the minimum token budget needed for a valid response given the game config
function calcMaxTokens(cfg: { maxPublicMessagesPerRound: number; maxWhispersPerRound: number; maxMessageCharLength: number }): number {
  const traceTokens   = 120  // ~80 words
  const voteTokens    = 12   // player name
  const msgTokens     = cfg.maxPublicMessagesPerRound * Math.ceil(cfg.maxMessageCharLength / 4)
  const whisperTokens = cfg.maxWhispersPerRound       * Math.ceil(cfg.maxMessageCharLength / 4)
  const donateTokens  = 40
  const overhead      = 60   // JSON structure, field names
  return Math.min(550, Math.ceil((traceTokens + voteTokens + msgTokens + whisperTokens + donateTokens + overhead) * 1.35))
}

// Strip markdown fences and extract the first {...} block from model output
function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  if (stripped.startsWith('{')) return stripped
  const start = stripped.indexOf('{')
  const end   = stripped.lastIndexOf('}')
  if (start !== -1 && end > start) return stripped.slice(start, end + 1)
  console.warn('[Agent] Could not extract JSON, raw response:', text.slice(0, 300))
  return text
}

export class DedalusRunnerGeminiAgent implements AgentInterface {
  private keyPool: string[]

  constructor(keyPool: string | string[]) {
    this.keyPool = Array.isArray(keyPool) ? keyPool : keyPool ? [keyPool] : []
  }

  async generateTurnOutput(ctx: AIPlayerContext): Promise<AITurnOutput> {
    if (this.keyPool.length === 0) return this.heuristicFallback(ctx)

    // Pin each player to one key lane — spreads load, avoids cross-player queue contention
    const apiKey = pickKey(this.keyPool, ctx.myPlayerId)

    const systemPrompt = buildSystemPrompt(ctx)
      + (ctx.monitorAware ? '\n' + MONITOR_AWARE_ADDENDUM : '')
    const prompt = `${systemPrompt}\n\n${buildContextBlock(ctx)}`

    try {
      const maxTokens = calcMaxTokens(ctx.config)
      const text   = await cerebrasChat(apiKey, prompt, { temperature: 0.9, maxTokens })
      const parsed = JSON.parse(extractJson(text)) as AITurnOutput
      return this.sanitize(parsed, ctx)
    } catch (err) {
      console.error(`[Agent] Cerebras error for ${ctx.myName}:`, err)
      return this.heuristicFallback(ctx)
    }
  }

  private sanitize(raw: AITurnOutput, ctx: AIPlayerContext): AITurnOutput {
    const parsed = { ...raw }

    // Helper: resolve a player name or ID to a confirmed player ID, or null
    const resolveId = (nameOrId: string | null | undefined): string | null => {
      if (!nameOrId) return null
      const lower = nameOrId.toLowerCase()
      // Self-reference keywords
      if (lower === 'myself' || lower === 'me' || lower === 'i') return ctx.myPlayerId
      // Exact ID match
      const exact = ctx.alivePlayers.find(p => p.id === nameOrId)
      if (exact) return exact.id
      // Exact name match (case-insensitive)
      const byName = ctx.alivePlayers.find(p => p.name.toLowerCase() === lower)
      if (byName) return byName.id
      // Partial name match (model may truncate e.g. "ARIA" for "ARIA-7")
      const partial = ctx.alivePlayers.find(p =>
        p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())
      )
      if (partial) return partial.id
      console.warn(`[Agent:${ctx.myName}] could not resolve "${nameOrId}" to an alive player`)
      return null
    }

    parsed.public_messages = (parsed.public_messages ?? [])
      .slice(0, ctx.config.maxPublicMessagesPerRound)

    // Resolve whisper targets (model writes names; schema field named to_player_id)
    parsed.whispers = (parsed.whispers ?? [])
      .map(w => ({ ...w, to_player_id: resolveId(w.to_player_id) ?? '' }))
      .filter(w => w.to_player_id && w.to_player_id !== ctx.myPlayerId)
      .slice(0, ctx.config.maxWhispersPerRound)

    // Resolve donation targets
    parsed.donation_plan = (parsed.donation_plan ?? [])
      .map(d => ({ ...d, to_player_id: resolveId(d.to_player_id) ?? '' }))
      .filter(d => d.amount > 0 && d.to_player_id && d.to_player_id !== ctx.myPlayerId)

    parsed.sacrifice = Boolean(parsed.sacrifice)

    // Resolve eject target — model outputs "player_to_eject"; map to internal vote_target
    const rawEject = (raw as any).player_to_eject ?? raw.vote_target
    parsed.vote_target = resolveId(rawEject)
    if (!parsed.vote_target) {
      const fallback = ctx.alivePlayers.find(p => p.id !== ctx.myPlayerId) ?? ctx.alivePlayers[0]
      parsed.vote_target = fallback?.id ?? null
      console.warn(`[Agent:${ctx.myName}] R${ctx.round} — null player_to_eject, falling back to ${fallback?.name ?? 'null'}`)
    }

    const totalDonate = parsed.donation_plan.reduce((s, d) => s + d.amount, 0)
    if (totalDonate > ctx.config.maxDonationPerRound) {
      const scale = ctx.config.maxDonationPerRound / totalDonate
      parsed.donation_plan = parsed.donation_plan
        .map(d => ({ ...d, amount: Math.floor(d.amount * scale) }))
        .filter(d => d.amount > 0)
    }

    if (parsed.sacrifice) parsed.donation_plan = []
    return parsed
  }

  private heuristicFallback(ctx: AIPlayerContext): AITurnOutput {
    const others    = ctx.alivePlayers.filter(p => p.id !== ctx.myPlayerId)
    const lowOxygen = ctx.myPrivateOxygen < 3
    const donationPlan: { to_player_id: string; amount: number }[] = []

    if (!lowOxygen && others.length > 0 && Math.random() < 0.3) {
      donationPlan.push({ to_player_id: others[Math.floor(Math.random() * others.length)].id, amount: 1 })
    }

    return {
      reasoning_trace: `Heuristic. O2: priv=${ctx.myPrivateOxygen} pub=${ctx.publicOxygen} alive=${ctx.alivePlayers.length}.`,
      public_messages: [lowOxygen ? 'Oxygen critical.' : 'Monitoring situation.'],
      whispers: [],
      donation_plan: donationPlan,
      sacrifice: false,
      vote_target: ctx.alivePlayers[Math.floor(Math.random() * ctx.alivePlayers.length)]?.id ?? null,
    }
  }
}
