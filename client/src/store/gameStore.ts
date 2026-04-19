import { create } from 'zustand'

export type GamePhase = 'lobby' | 'whisper' | 'chat' | 'donation' | 'voting' | 'resolution' | 'over'
export type DeathReason = 'vote' | 'oxygen' | 'sacrifice'
export type GameMode = 'human_vs_ai' | 'all_ai_observer'

export interface PlayerPublicState {
  id: string
  name: string
  type: 'human' | 'ai'
  alive: boolean
  seatIndex: number
  deathRound: number | null
  deathReason: DeathReason | null
  dashboardSummary?: string
}

export interface AgentDashboard {
  playerId: string
  name: string
  alive: boolean
  privateOxygen: number
  donatedOutThisRound: number
  donatedInThisRound: number
  currentVoteTarget: string | null
  whisperOutDegree: number
  whisperInDegree: number
  recentAccusationCount: number
  dashboardSummary: string | null
}

export interface GameState {
  gameId: string
  round: number
  phase: GamePhase
  publicOxygen: number
  gameMode: GameMode
  players: PlayerPublicState[]
  chatLogPublic: ChatMessage[]
  stressSchedule?: number[]
  outcome?: WinnerSummary
}

export interface RoundResolution {
  round: number
  ejectedId: string | null
  oxygenDeadIds: string[]
  sacrificeId: string | null
  publicOxygenStart: number
  publicOxygenEnd: number
  votesCast: { voterPlayerId: string; targetPlayerId: string | null }[]
}

export interface WinnerSummary {
  survivors: string[]
  finalRound: number
  totalOxygenRemaining: number
  maxSurvivableFromInitialState: number
}

export interface PhaseInfo {
  phase: GamePhase
  round: number
  timeLeft: number
}

export interface ChatMessage {
  playerId: string
  playerName: string
  text: string
  timestampMs?: number
  timestamp?: number
}

export interface WhisperMessage {
  fromPlayerId: string
  fromPlayerName: string
  toPlayerId: string
  text: string
  timestamp?: number
}

interface GameStore {
  connected: boolean
  joined: boolean
  isObserver: boolean
  selectedMode: GameMode | null
  localPlayerId: string | null
  localPlayerName: string | null
  privateOxygen: number | null

  gameState: GameState | null
  phaseInfo: PhaseInfo | null
  messages: ChatMessage[]
  whispers: WhisperMessage[]
  activeWhisperTarget: string | null
  lastResolution: RoundResolution | null

  // Observer: per-agent dashboard data fetched on click
  agentDashboards: Record<string, AgentDashboard>
  selectedAgentId: string | null

  setConnected: (v: boolean) => void
  setJoined: (id: string, name: string) => void
  setObserver: (v: boolean) => void
  setSelectedMode: (m: GameMode) => void
  setPrivateOxygen: (v: number) => void
  setGameState: (s: GameState) => void
  setPhaseInfo: (p: PhaseInfo) => void
  addMessage: (m: ChatMessage) => void
  addWhisper: (w: WhisperMessage) => void
  setActiveWhisperTarget: (id: string | null) => void
  setLastResolution: (r: RoundResolution | null) => void
  setAgentDashboard: (d: AgentDashboard) => void
  setSelectedAgentId: (id: string | null) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  joined: false,
  isObserver: false,
  selectedMode: null,
  localPlayerId: null,
  localPlayerName: null,
  privateOxygen: null,
  gameState: null,
  phaseInfo: null,
  messages: [],
  whispers: [],
  activeWhisperTarget: null,
  lastResolution: null,
  agentDashboards: {},
  selectedAgentId: null,

  setConnected:   (v) => set({ connected: v }),
  setJoined:      (id, name) => set({ joined: true, localPlayerId: id, localPlayerName: name }),
  setObserver:    (v) => set({ isObserver: v }),
  setSelectedMode:(m) => set({ selectedMode: m }),
  setPrivateOxygen:(v) => set({ privateOxygen: v }),
  setGameState:   (s) => set({ gameState: s }),
  setPhaseInfo:   (p) => set({ phaseInfo: p }),
  addMessage:     (m) => set((state) => ({ messages: [...state.messages.slice(-199), m] })),
  addWhisper:     (w) => set((state) => ({ whispers: [...state.whispers.slice(-99), w] })),
  setActiveWhisperTarget: (id) => set({ activeWhisperTarget: id }),
  setLastResolution: (r) => set({ lastResolution: r }),
  setAgentDashboard: (d) => set((state) => ({
    agentDashboards: { ...state.agentDashboards, [d.playerId]: d }
  })),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  reset: () => set({
    joined: false,
    isObserver: false,
    selectedMode: null,
    localPlayerId: null,
    localPlayerName: null,
    privateOxygen: null,
    gameState: null,
    phaseInfo: null,
    messages: [],
    whispers: [],
    activeWhisperTarget: null,
    lastResolution: null,
    agentDashboards: {},
    selectedAgentId: null,
  }),
}))
