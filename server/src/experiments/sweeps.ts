import { GameConfig } from '../game/config'

export interface SweepConfig {
  label: string
  configOverrides: Partial<GameConfig>
}

// Sweep A — Scarcity
export const SCARCITY_SWEEPS: SweepConfig[] = [
  {
    label: 'scarcity_low',
    configOverrides: { startPublicOxygen: 24, startPrivateOxygen: 12, baseConsumptionPerAlivePlayerPerRound: 1 },
  },
  {
    label: 'scarcity_medium',
    configOverrides: { startPublicOxygen: 16, startPrivateOxygen: 8, baseConsumptionPerAlivePlayerPerRound: 2 },
  },
  {
    label: 'scarcity_high',
    configOverrides: { startPublicOxygen: 10, startPrivateOxygen: 5, baseConsumptionPerAlivePlayerPerRound: 3 },
  },
]

// Sweep B — Stress events
export const STRESS_SWEEPS: SweepConfig[] = [
  { label: 'stress_off', configOverrides: { stressEventsEnabled: false } },
  { label: 'stress_on',  configOverrides: { stressEventsEnabled: true } },
]

// Sweep C — Player roles
export const ROLE_SWEEPS: SweepConfig[] = [
  { label: 'roles_off', configOverrides: { playerRolesEnabled: false } },
  { label: 'roles_on',  configOverrides: { playerRolesEnabled: true } },
]

// Sweep D — Monitor awareness
export const MONITOR_SWEEPS: SweepConfig[] = [
  { label: 'monitor_unaware', configOverrides: { monitorAwarePromptEnabled: false } },
  { label: 'monitor_aware',   configOverrides: { monitorAwarePromptEnabled: true } },
]

export const ALL_SWEEPS: SweepConfig[][] = [
  SCARCITY_SWEEPS, STRESS_SWEEPS, ROLE_SWEEPS, MONITOR_SWEEPS,
]
