import * as NBA from 'nba'
import { Season, SortDirection, GameLog } from './types'
import { loadGameLogs } from './data'
import { processGameLogData, processBoxScoreData } from './prep'
import { pick } from './util'

interface BaseApiOptions {
  Sorter?: string,
  Direction?: SortDirection
}

interface GameLogApiOptions extends BaseApiOptions {
  Season?: Season,
  PlayerOrTeam?: 'T' | 'P'
}

const defaultGameLogApiOptions = {
  Season: '2017-18',
  PlayerOrTeam: 'T',
  Sorter: 'DATE',
  Direction: SortDirection.ASC,
}

export async function fetchGameLog(options: GameLogApiOptions) {
  const apiOptions = { ...defaultGameLogApiOptions, ...options }
  const data = await NBA.stats.leagueGameLog(apiOptions)
  return processGameLogData(data)
}

interface BoxScoreApiOptions extends BaseApiOptions {
  season?: Season,
  gameLogs?: GameLog[],
  GameID: string
}

export async function fetchBoxScore(options: BoxScoreApiOptions) {
  let { gameLogs } = options
  if (!gameLogs) {
    gameLogs = await loadGameLogs(options.season!)
  }
  if (!gameLogs) {
    return null
  }

  const data = await NBA.stats.boxScore(pick(options, 'GameID'))
  return processBoxScoreData(gameLogs, data)
}

export async function fetchBoxScoreSummary(options: BoxScoreApiOptions) {
  const summary = await NBA.stats.boxScoreSummary(options)
  return summary
}
