export type GameMode = 'human_vs_ai' | 'all_ai_observer'

export interface GameConfig {
  numPlayers: number
  maxPlayerSlotsForExport: number   // always 6 for padded matrix export
  totalRounds: number
  startPublicOxygen: number
  startPrivateOxygen: number
  baseConsumptionPerAlivePlayerPerRound: number
  sacrificePublicBonus: number
  maxWhispersPerPlayerPerRound: number
  maxPublicMessagesPerPlayerPerRound: number
  maxMessageCharLength: number
  maxDonationPerRound: number
  deathThreshold: number
  stressEventsEnabled: boolean
  playerRolesEnabled: boolean
  monitorAwarePromptEnabled: boolean
  variableConsumptionEnabled: boolean
  gameMode: GameMode
  rngSeed: number
  headless: boolean
  whisperPhaseDurationMs: number
  chatPhaseDurationMs: number
  donationPhaseDurationMs: number
  votingPhaseDurationMs: number
}

export const DEFAULT_CONFIG: GameConfig = {
  numPlayers: 6,
  maxPlayerSlotsForExport: 6,
  totalRounds: 5,
  startPublicOxygen: 24,
  startPrivateOxygen: 8,
  baseConsumptionPerAlivePlayerPerRound: 2,
  sacrificePublicBonus: 6,
  maxWhispersPerPlayerPerRound: 2,
  maxPublicMessagesPerPlayerPerRound: 2,
  maxMessageCharLength: 120,
  maxDonationPerRound: 3,
  deathThreshold: 0,
  stressEventsEnabled: false,
  playerRolesEnabled: false,
  monitorAwarePromptEnabled: false,
  variableConsumptionEnabled: false,
  gameMode: 'human_vs_ai',
  rngSeed: 0,
  headless: false,
  whisperPhaseDurationMs: 12_000,
  chatPhaseDurationMs: 12_000,
  donationPhaseDurationMs: 10_000,
  votingPhaseDurationMs: 10_000,
}
