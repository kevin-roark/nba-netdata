import { BoxScore, PlayerInfo, PlayerBoxScoreStats, NonDerivedBoxScoreStats } from './types'
import { playerMap } from './data'

export interface BoxScoreFilter {
  minMinutes: number
}

const defaultGameFilter: BoxScoreFilter = {
  minMinutes: 0
}

export const smallSampleSeasonFilter: BoxScoreFilter = {
  minMinutes: 48 * 4
}

export function getPlayersFromBoxScore(boxScore: BoxScore): PlayerInfo[] {
  return filterPlayerStats(boxScore.playerStats)
    .map(p => playerMap.idMap[p.PLAYER_ID])
}

export function filterPlayerStats<T extends PlayerBoxScoreStats>(playerStats: T[], filter: BoxScoreFilter = defaultGameFilter): T[] {
  return playerStats
    .filter(p => boxScoreStatsFilter(p, filter))
    .filter(p => !!playerMap.idMap[p.PLAYER_ID])
}

export function boxScoreStatsFilter(b: NonDerivedBoxScoreStats, filter: BoxScoreFilter) {
  return b.MIN > filter.minMinutes
}

export function boxScoreSeasonFilter(b: NonDerivedBoxScoreStats) {
  return boxScoreStatsFilter(b, smallSampleSeasonFilter)
}
