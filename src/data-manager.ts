import * as NBA from 'nba'
import { join } from 'path'
import { SortDirection, GameLog, BoxScore, Season, TeamAbbreviation, CompleteGameBoxScores, GameStats, PlayerBoxScores, PlayerInfo } from './types'
import { playerMap, gameIdMap, boxScoreSeasons } from './data'
import { processGameLogData, processBoxScoreData } from './prep'
import { getPlayByPlayShotData, PlayByPlayShotData, RawNBAPlayByPlayData } from './play-by-play'
import { pick } from './util'

export type DataCategory = 'game_logs' | 'box_scores'
export type PlayerOrTeam = 'P' | 'T'
export enum APIGamePeriod {
  Q1 = '0',
  Q2 = '1',
  Q3 = '2',
  Q4 = '3'
}

export interface FileGetter {
  getFullPath: (path: string) => string,
  getPathData: (path: string) => Promise<any>
}

export class DataManager {
  readonly fileGetter: FileGetter
  constructor(fileGetter: FileGetter) {
    this.fileGetter = fileGetter
  }

  getSeasonPath(category: DataCategory, season: Season) {
    return join(category, `${season}.json`)
  }

  getTeamSeasonPath(category: DataCategory, season: Season, team: TeamAbbreviation) {
    return join(category, season, `${team}.json`)
  }

  async loadSeasonData(category: DataCategory, season: Season) {
    return await this.fileGetter.getPathData(this.getSeasonPath(category, season))
  }

  async loadTeamData(category: DataCategory, season: Season, team: TeamAbbreviation) {
    return await this.fileGetter.getPathData(this.getTeamSeasonPath(category, season, team))
  }

  async loadGameLogs(season: Season): Promise<GameLog[] | null> {
    return await this.loadSeasonData('game_logs', season)
  }

  async loadTeamBoxScores(season: Season, team: TeamAbbreviation): Promise<BoxScore[] | null> {
    return await this.loadTeamData('box_scores', season, team)
  }

  async loadTeamBoxScore(season: Season, team: TeamAbbreviation, gameId: string): Promise<BoxScore | null> {
    const boxScores = await this.loadTeamBoxScores(season, team) || []
    const boxScore = boxScores.find(b => b.game.GAME_ID === gameId)
    return boxScore || null
  }

  async loadPlayerBoxScores(playerId: string, season?: Season | null): Promise<PlayerBoxScores | null> {
    const playerInfo = playerMap.idMap[playerId]
    if (!playerInfo) {
      return null
    }

    const scores: GameStats[] = []

    const seasons = season ? [season] : boxScoreSeasons
    await Promise.all(seasons.map(async (season) => {
      const teams = playerInfo.teams[season] || []
      await Promise.all(teams.map(async ({ team }) => {
        const boxScores = await this.loadTeamBoxScores(season, team)
        if (boxScores) {
          boxScores.forEach(boxScore => {
            const playerStats = boxScore.playerStats.find(ps => ps.PLAYER_ID === playerId)
            if (playerStats) {
              scores.push({ game: boxScore.game, stats: playerStats })
            }
          })
        }
      }))
    }))

    scores.sort((a, b) => a.game.GAME_DATE.localeCompare(b.game.GAME_DATE))

    return { player: playerInfo, scores }
  }

  async loadGameBoxScores(gameId: string): Promise<CompleteGameBoxScores | null> {
    const { season, home, away } = gameIdMap[gameId]
    const [homeScore, awayScore] = await Promise.all([
      this.loadTeamBoxScore(season, home, gameId),
      this.loadTeamBoxScore(season, away, gameId)
    ])
    if (!homeScore || !awayScore) {
      return null
    }

    return {
      home: { team: home, score: homeScore, players: getPlayersFromBoxScore(homeScore) },
      away: { team: away, score: awayScore, players: getPlayersFromBoxScore(awayScore) }
    }
  }

  async fetchGameLog(options: { Season?: Season, PlayerOrTeam?: PlayerOrTeam, Sorter?: string, Direction?: SortDirection }) {
    const defaultGameLogApiOptions = { Season: '2017-18', PlayerOrTeam: 'T', Sorter: 'DATE', Direction: SortDirection.ASC }
    const apiOptions = { ...defaultGameLogApiOptions, ...options }
    const data = await NBA.stats.leagueGameLog(apiOptions)
    return processGameLogData(data)
  }

  async fetchBoxScore(options: { GameID: string, season: Season }): Promise<BoxScore[] | null> {
    const gameLogs = await this.loadGameLogs(options.season)
    if (!gameLogs) {
      return null
    }

    return await this.fetchBoxScoreWithGameLogs({ GameID: options.GameID, gameLogs })
  }

  async fetchBoxScoreWithGameLogs(options: { GameID: string, gameLogs: GameLog[] }): Promise<BoxScore[]> {
    const data = await NBA.stats.boxScore(pick(options, 'GameID'))
    return processBoxScoreData(options.gameLogs, data)
  }

  async fetchBoxScoreSummary(options: { GameID: string }) {
    const summary = await NBA.stats.boxScoreSummary(options)
    return summary
  }

  async fetchPlayByPlayShotData(options: { GameID: string, StartPeriod?: APIGamePeriod, EndPeriod?: APIGamePeriod }): Promise<PlayByPlayShotData | null> {
    const data: RawNBAPlayByPlayData = await NBA.stats.playByPlay(options)
    if (!data || !data.playByPlay || data.playByPlay.length === 0) {
      return null
    }

    const boxScores = await this.loadGameBoxScores(options.GameID)
    if (!boxScores) {
      return null
    }

    return getPlayByPlayShotData(data, boxScores)
  }
}

function getPlayersFromBoxScore(boxScore: BoxScore): PlayerInfo[] {
  return boxScore.playerStats
    .filter(p => p.MIN > 0)
    .map(p => playerMap.idMap[p.PLAYER_ID])
    .filter(p => !!p)
}
