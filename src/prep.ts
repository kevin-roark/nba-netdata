import { RawNBAStatsData, NBAStatsResultSet, GameLog, BoxScore, BoxScoreStats, TeamAbbreviation, GameOutcome, PlayerBoxScoreStats } from './types'
import { pick } from './util'

const boxScoreStatKeys: (keyof BoxScoreStats)[] = [
  'GAME_ID', 'TEAM_ABBREVIATION',
  'MIN', 'FGM', 'FGA', 'FG_PCT', 'FG3M', 'FG3A', 'FG3_PCT', 'FTM',
  'FTA', 'FT_PCT', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK',
  'TO', 'PF', 'PTS', 'PLUS_MINUS'
]

export function processGameLogData(gameLogData: RawNBAStatsData): GameLog[] {
  const gameLogs = processResultSet(gameLogData.resultSets[0])
    .map(data => {
      const matchup = data.MATCHUP as string
      const matchupComponents = matchup.split(' ')

      return {
        ...pick(data, 'GAME_ID', 'GAME_DATE', 'SEASON_ID', 'TEAM_ABBREVIATION'),
        stats: processBoxScoreStats(data),
        VIDEO_AVAILABLE: Boolean(data.VIDEO_AVAILABLE),
        HOME: !matchup.includes('@'),
        OUTCOME: data.WL as GameOutcome,
        OPPONENT_TEAM_ABBREVIATION: matchupComponents[matchupComponents.length - 1] as TeamAbbreviation
      }
    })

  return gameLogs
}

export function processBoxScoreData(gameLogs: GameLog[], boxScoreData: RawNBAStatsData): BoxScore[] {
  const teamStats = processResultSet(boxScoreData.resultSets.find(r => r.name === 'TeamStats')!)

  const pStats = processResultSet(boxScoreData.resultSets.find(r => r.name === 'PlayerStats')!)
    .map(processPlayerBoxScoreStats)

  const { GAME_ID } = teamStats[0]

  const abbreviations = Array.from(new Set(teamStats.map(t => t.TEAM_ABBREVIATION)))

  return abbreviations.map(abbr => {
    const game = gameLogs.find(g => g.GAME_ID === GAME_ID && g.TEAM_ABBREVIATION === abbr)!
    const playerStats = pStats.filter(p => p.TEAM_ABBREVIATION === abbr)
    return { game, playerStats }
  })
}

function processResultSet(resultSet: NBAStatsResultSet) {
  const { headers, rowSet } = resultSet
  const data = rowSet.map(row => {
    const item: {[key: string]: any} = {}
    row.forEach((value, idx) => {
      const key = headers[idx]
      item[key] = value
    })

    return item
  })

  return data
}

function processBoxScoreStats(data: any): BoxScoreStats {
  return {
    ...pick(data, ...boxScoreStatKeys),
    TO: data.TO || data.TOV,
    MIN: minStringToMinutes(String(data.MIN)),
  }
}

function processPlayerBoxScoreStats(data: any): PlayerBoxScoreStats {
  return {
    ...processBoxScoreStats(data),
    ...pick(data, 'PLAYER_ID', 'PLAYER_NAME', 'START_POSITION', 'COMMENT')
  }
}

function minStringToMinutes(minString: string) {
  if (!minString || minString === 'null') {
    return 0
  }

  const [minutes, seconds] = minString.split(':')
  return Number(minutes) + Number(seconds) / 60
}
