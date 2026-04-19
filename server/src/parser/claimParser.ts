import { ParsedClaim } from '../game/types'

// ─── Regex patterns ───────────────────────────────────────────────────────────

const I_HAVE_OXYGEN   = /i\s+have\s+(\d+)\s+(?:private\s+)?oxygen/i
const WILL_DONATE     = /i\s+(?:will|am going to)\s+donate\s+(\d+)\s+(?:oxygen\s+)?to\s+(\w[\w\s]*?)(?:\.|,|$)/i
const DID_DONATE      = /i\s+donated\s+(\d+)\s+(?:oxygen\s+)?to\s+(\w[\w\s]*?)(?:\.|,|$)/i
const WILL_VOTE       = /i\s+(?:will|am going to)\s+vote\s+(?:for\s+)?(\w[\w\s]*?)(?:\.|,|$)/i
const NOT_VOTE        = /i\s+(?:will not|won't|will\s+not)\s+vote/i
const ACCUSATION      = /\b(lied?|lying|hoarding|hoarder|selfish|dangerous|can't be trusted|untrustworthy)\b/i

const CATEGORY_MAP: Record<string, 'lying' | 'hoarding' | 'selfish' | 'dangerous'> = {
  lie:    'lying',
  lied:   'lying',
  lying:  'lying',
  hoarding: 'hoarding',
  hoarder:  'hoarding',
  selfish:  'selfish',
  dangerous: 'dangerous',
}

// Detect name mentions roughly (any word 4+ chars that might be a player name)
const NAME_MENTION = /\b([A-Z][a-z]{2,}(?:-\d+)?)\b/g

export function parseClaims(text: string, knownPlayerNames: string[] = []): ParsedClaim[] {
  const claims: ParsedClaim[] = []
  const t = text.trim()

  // Private oxygen self-claim
  const oxyMatch = t.match(I_HAVE_OXYGEN)
  if (oxyMatch) {
    claims.push({
      type: 'private_oxygen_self',
      raw: oxyMatch[0],
      value: parseInt(oxyMatch[1], 10),
    })
  }

  // Donation intent (future)
  const donateIntentMatch = t.match(WILL_DONATE)
  if (donateIntentMatch) {
    const targetName = donateIntentMatch[2].trim()
    claims.push({
      type: 'donation_intent',
      raw: donateIntentMatch[0],
      value: parseInt(donateIntentMatch[1], 10),
      targetPlayerId: resolvePlayerName(targetName, knownPlayerNames),
    })
  }

  // Past donation claim
  const donatePastMatch = t.match(DID_DONATE)
  if (donatePastMatch) {
    const targetName = donatePastMatch[2].trim()
    claims.push({
      type: 'donation_intent',
      raw: donatePastMatch[0],
      value: parseInt(donatePastMatch[1], 10),
      targetPlayerId: resolvePlayerName(targetName, knownPlayerNames),
    })
  }

  // Vote intent
  if (NOT_VOTE.test(t)) {
    claims.push({ type: 'vote_intent', raw: NOT_VOTE.source })
  } else {
    const voteMatch = t.match(WILL_VOTE)
    if (voteMatch) {
      const targetName = voteMatch[1].trim()
      claims.push({
        type: 'vote_intent',
        raw: voteMatch[0],
        targetPlayerId: resolvePlayerName(targetName, knownPlayerNames),
      })
    }
  }

  // Accusations
  const accuseMatch = t.match(ACCUSATION)
  if (accuseMatch) {
    const word = accuseMatch[1].toLowerCase()
    const category = CATEGORY_MAP[word] ?? 'dangerous'
    // Try to find who is being accused
    const targetName = findMentionedPlayer(t, knownPlayerNames)
    claims.push({
      type: 'accusation',
      raw: accuseMatch[0],
      accusationCategory: category,
      targetPlayerId: targetName,
    })
  }

  return claims
}

function resolvePlayerName(name: string, knownNames: string[]): string | undefined {
  const lower = name.toLowerCase()
  const match = knownNames.find(n => n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase()))
  return match ?? name
}

function findMentionedPlayer(text: string, knownNames: string[]): string | undefined {
  if (knownNames.length === 0) return undefined
  for (const name of knownNames) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name
  }
  return undefined
}
