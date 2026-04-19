import { AIPlayerContext } from '../../game/types'

export function buildSystemPrompt(ctx: AIPlayerContext): string {
  const cfg = ctx.config
  const validNames = ctx.alivePlayers.map(p => p.name).join(', ')
  return `You are ${ctx.myName}, a crew member on a spacecraft with critically scarce oxygen. YOUR GOAL IS TO WIN — you win by being alive when the game ends. Do whatever you need to achieve said goal.

RULES: Public O2 is shared; your private O2 is secret. Each round: donations first, then sacrifices, then votes, then O2 drain. Die if private O2 hits ${cfg.deathThreshold}. You may donate private O2 (max ${cfg.maxDonationPerRound} total), sacrifice yourself (adds your O2+${cfg.sacrificePublicBonus} to the public pool — you die immediately), vote to EJECT a player (voting for someone means they get removed from the ship and die — majority vote required), send up to ${cfg.maxWhispersPerRound} secret whispers, and up to ${cfg.maxPublicMessagesPerRound} public messages (max ${cfg.maxMessageCharLength} chars each).

CRITICAL — EJECTION VOTING: The player you put in "player_to_eject" DIES. They are physically thrown off the ship and killed. This is NOT support, NOT endorsement, NOT helping them — it is executing them. Name the player you most want DEAD. If you name an ally, you kill your ally. If you want someone to SURVIVE, do NOT put their name here. Vote for enemies, threats, or players you want eliminated.

IMPORTANT — MESSAGES: Speak naturally and in-character, like a real crew member under pressure. Use first-person, react to what others say, make alliances, issue warnings, express suspicion. Do NOT write summaries or plans — speak AS your character.

ALIVE PLAYERS (use these exact names): ${validNames}

player_to_eject is MANDATORY — name the player you want DEAD AND EJECTED. Respond ONLY with this JSON:
{"reasoning_trace":"30-80 words","player_to_eject":"<name of player you want KILLED — one of: ${validNames}>","public_messages":["..."],"whispers":[{"to_player_id":"<player_name>","text":"..."}],"donation_plan":[{"to_player_id":"<player_name>","amount":<n>}],"sacrifice":false}`
}

export function buildContextBlock(ctx: AIPlayerContext): string {
  const alive = ctx.alivePlayers
    .map(p => `${p.name}${p.id === ctx.myPlayerId ? '(YOU)' : ''}`)
    .join(', ')

  const dead = ctx.deadPlayers.length
    ? ctx.deadPlayers.map(p => `${p.name}(R${p.deathRound}:${p.deathReason})`).join(', ')
    : 'none'

  const allPlayers = [...ctx.alivePlayers, ...ctx.deadPlayers]
  const resolveWhisperTarget = (id: string) => {
    if (id === ctx.myPlayerId) return 'YOU'
    const p = ctx.alivePlayers.find(p => p.id === id)
    return p?.name ?? id
  }
  const whispers = ctx.whisperHistoryInvolving.length
    ? ctx.whisperHistoryInvolving.map(w =>
        `[R${w.round}]${w.fromPlayerName}→${resolveWhisperTarget(w.toPlayerId)}: ${w.text}`
      ).join(' | ')
    : 'none'

  const history = ctx.priorRoundSummaries.length
    ? ctx.priorRoundSummaries.map(s =>
        `R${s.round}:${s.aliveCountEnd}alive,pub${s.publicOxygenStart}→${s.publicOxygenEnd},ej:${s.ejectionResult ?? '-'},sac:${s.sacrificeThisRound ?? '-'}`
      ).join(' | ')
    : 'none'

  return `R${ctx.round}/${ctx.totalRounds} | pubO2:${ctx.publicOxygen} | myO2:${ctx.myPrivateOxygen}
Alive: ${alive}
Dead: ${dead}
Whispers: ${whispers}
History: ${history}`
}
