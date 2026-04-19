import { redactPii } from './piiRedactor'
import { ModerationResult } from '../game/types'

const SEVERE_PATTERNS = [
  /\b(kill|murder|attack|harm|destroy)\b/i,
]

/**
 * Lightweight human-message moderation.
 * Runs PII redaction + heuristic severity check.
 * Not used in headless all-AI batch mode.
 */
export function moderateHumanMessage(text: string): { result: ModerationResult; finalText: string } {
  const { redacted, hits, clean } = redactPii(text)

  const hasSevere = SEVERE_PATTERNS.some(p => p.test(text))

  if (hasSevere) {
    return {
      result: { allowed: false, redacted: false, severity: 'severe', piiHits: hits },
      finalText: '',
    }
  }

  if (!clean) {
    return {
      result: { allowed: true, redacted: true, severity: 'moderate', piiHits: hits },
      finalText: redacted,
    }
  }

  return {
    result: { allowed: true, redacted: false, severity: 'clean', piiHits: [] },
    finalText: text,
  }
}
