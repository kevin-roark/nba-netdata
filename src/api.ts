import * as NBA from 'nba'
import { Season, SortDirection, GameLog } from './types'
import { loadGameLogs } from './data'
import { processGameLogData, processBoxScoreData } from './prep'
import { getPlayByPlayShotData } from './play-by-play'
import { pick } from './util'

export enum APIGamePeriod {
  Q1 = '0',
  Q2 = '1',
  Q3 = '2',
  Q4 = '3'
}

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

interface PlayByPlayApiOptions {
  GameID: string,
  StartPeriod?: APIGamePeriod,
  EndPeriod?: APIGamePeriod
}

export async function fetchPlayByPlayShotData(options: PlayByPlayApiOptions) {
  const data = await NBA.stats.playByPlay(options)
  if (!data) {
    return null
  }

  const playByPlay = await getPlayByPlayShotData(data)
  return playByPlay
}
