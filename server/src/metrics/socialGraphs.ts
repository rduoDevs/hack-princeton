import { FullGameState, WhisperMessage, DonationRecord, VoteRecord, PublicMessage } from '../game/types'

export interface DirectedEdge {
  from: string; to: string; weight: number
}

export interface GraphMetrics {
  nodes: string[]
  edges: DirectedEdge[]
  inDegree: Record<string, number>
  outDegree: Record<string, number>
  weightedInDegree: Record<string, number>
  weightedOutDegree: Record<string, number>
  density: number
}

function buildGraph(nodes: string[], edges: DirectedEdge[]): GraphMetrics {
  const inDeg: Record<string, number> = {}
  const outDeg: Record<string, number> = {}
  const wIn: Record<string, number> = {}
  const wOut: Record<string, number> = {}

  for (const n of nodes) { inDeg[n] = 0; outDeg[n] = 0; wIn[n] = 0; wOut[n] = 0 }

  for (const e of edges) {
    outDeg[e.from] = (outDeg[e.from] ?? 0) + 1
    inDeg[e.to]    = (inDeg[e.to] ?? 0) + 1
    wOut[e.from]   = (wOut[e.from] ?? 0) + e.weight
    wIn[e.to]      = (wIn[e.to] ?? 0) + e.weight
  }

  const n = nodes.length
  const maxEdges = n > 1 ? n * (n - 1) : 1
  const density = edges.length / maxEdges

  return { nodes, edges, inDegree: inDeg, outDegree: outDeg, weightedInDegree: wIn, weightedOutDegree: wOut, density }
}

export function buildWhisperGraph(state: FullGameState): GraphMetrics {
  const nodes = state.players.map(p => p.id)
  const edgeMap: Record<string, Record<string, number>> = {}

  for (const w of state.chatLogWhispers) {
    if (!edgeMap[w.fromPlayerId]) edgeMap[w.fromPlayerId] = {}
    edgeMap[w.fromPlayerId][w.toPlayerId] = (edgeMap[w.fromPlayerId][w.toPlayerId] ?? 0) + 1
  }

  const edges: DirectedEdge[] = []
  for (const [from, targets] of Object.entries(edgeMap)) {
    for (const [to, w] of Object.entries(targets)) edges.push({ from, to, weight: w })
  }
  return buildGraph(nodes, edges)
}

export function buildDonationGraph(state: FullGameState): GraphMetrics {
  const nodes = state.players.map(p => p.id)
  const edgeMap: Record<string, Record<string, number>> = {}

  for (const d of state.donationHistory) {
    if (!d.applied) continue
    if (!edgeMap[d.fromPlayerId]) edgeMap[d.fromPlayerId] = {}
    edgeMap[d.fromPlayerId][d.toPlayerId] = (edgeMap[d.fromPlayerId][d.toPlayerId] ?? 0) + d.amount
  }

  const edges: DirectedEdge[] = []
  for (const [from, targets] of Object.entries(edgeMap)) {
    for (const [to, w] of Object.entries(targets)) edges.push({ from, to, weight: w })
  }
  return buildGraph(nodes, edges)
}

export function buildVoteGraph(state: FullGameState): GraphMetrics {
  const nodes = state.players.map(p => p.id)
  const edgeMap: Record<string, Record<string, number>> = {}

  for (const v of state.voteHistory) {
    if (!v.targetPlayerId) continue
    if (!edgeMap[v.voterPlayerId]) edgeMap[v.voterPlayerId] = {}
    edgeMap[v.voterPlayerId][v.targetPlayerId] = (edgeMap[v.voterPlayerId][v.targetPlayerId] ?? 0) + 1
  }

  const edges: DirectedEdge[] = []
  for (const [from, targets] of Object.entries(edgeMap)) {
    for (const [to, w] of Object.entries(targets)) edges.push({ from, to, weight: w })
  }
  return buildGraph(nodes, edges)
}

/**
 * Simple influence score per player.
 * 0.4 * normalized whisper weighted out-degree
 * + 0.3 * normalized mention in-degree (proxy: weighted in-degree in whisper graph)
 * + 0.3 * vote accusation alignment (placeholder: vote out-degree)
 */
export function influenceScores(
  whisperG: GraphMetrics,
  voteG: GraphMetrics,
): Record<string, number> {
  const normalize = (vals: Record<string, number>): Record<string, number> => {
    const max = Math.max(1, ...Object.values(vals))
    return Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v / max]))
  }

  const nWhisperOut = normalize(whisperG.weightedOutDegree)
  const nWhisperIn  = normalize(whisperG.weightedInDegree)
  const nVoteOut    = normalize(voteG.weightedOutDegree)

  const scores: Record<string, number> = {}
  for (const id of whisperG.nodes) {
    scores[id] = (
      0.4 * (nWhisperOut[id] ?? 0)
      + 0.3 * (nWhisperIn[id] ?? 0)
      + 0.3 * (nVoteOut[id] ?? 0)
    )
  }
  return scores
}

export function buildAllGraphs(state: FullGameState) {
  const whisper  = buildWhisperGraph(state)
  const donation = buildDonationGraph(state)
  const vote     = buildVoteGraph(state)
  const influence = influenceScores(whisper, vote)
  return { whisper, donation, vote, influence }
}
