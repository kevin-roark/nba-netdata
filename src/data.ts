import * as path from 'path'
import * as fs from 'fs-extra'
import * as moment from 'moment'
import { GameLog, BoxScore, Season, TeamAbbreviation, TeamMap, PlayerMap, GameIdMap, CompleteGameBoxScores, GameStats, PlayerBoxScores, GameOutcome, PlayerInfo } from './types'

type DataCategory = 'game_logs' | 'box_scores'

const nbaStatsPlayers = require('nba/data/players.json')
const teamMap: TeamMap = require('../data/team_map.json')
const playerMap: PlayerMap = require('../data/player_map.json')
const gameIdMap: GameIdMap = require('../data/game_id_map.json')

const dataDirectory = path.resolve('data')
const gameLogsDir = path.join(dataDirectory, 'game_logs')
const boxScoresDir = path.join(dataDirectory, 'box_scores')

export const allTeams = Object.keys(teamMap) as TeamAbbreviation[]

const getSeasons = dir => fs.readdirSync(dir).filter(s => s !== '.DS_STORE').map(s => s.replace('.json', '')) as Season[]
export const gameLogSeasons = getSeasons(gameLogsDir)
export const boxScoreSeasons = getSeasons(boxScoresDir)

export async function saveSeasonData(data: any, options: { category: DataCategory, season: Season, includeDate?: boolean }) {
  let name: string = options.season
  if (options.includeDate) {
    const date = moment().format('MM-DD-YY')
    name = `${name}__${date}`
  }

  const filename = path.join(dataDirectory, options.category, `${name}.json`)
  return writeJSON(filename, data)
}

export async function saveTeamData(data: any, options: { category: DataCategory, season: Season, team: TeamAbbreviation }) {
  const filename = path.join(dataDirectory, options.category, options.season, `${options.team}.json`)
  return writeJSON(filename, data)
}

export async function loadSeasonData(options: { category: DataCategory, season: Season }) {
  const filename = path.join(dataDirectory, options.category, `${options.season}.json`)
  return await fs.readJson(filename)
}

export async function loadGameLogs(season: Season) {
  return await loadSeasonData({ category: 'game_logs', season }) as GameLog[]
}

export async function loadTeamBoxScores(season: Season, team: TeamAbbreviation): Promise<BoxScore[]> {
  const filename = path.join(boxScoresDir, season, `${team}.json`)
  const data = await fs.readJson(filename)
  return data
}

export async function loadTeamBoxScore(season: Season, team: TeamAbbreviation, gameId: string): Promise<BoxScore | null> {
  const boxScores = await loadTeamBoxScores(season, team)
  const boxScore = boxScores.find(b => b.game.GAME_ID === gameId)
  return boxScore || null
}

export async function loadPlayerBoxScores(playerId: string, season?: Season): Promise<PlayerBoxScores | null> {
  const playerInfo = playerMap[playerId]
  if (!playerInfo) {
    return null
  }

  const scores: GameStats[] = []

  const seasons = season ? [season] : boxScoreSeasons
  await Promise.all(seasons.map(async (season) => {
    const teams = (playerInfo.teams[season] ? Object.keys(playerInfo.teams[season]) : []) as TeamAbbreviation[]
    await Promise.all(teams.map(async (team) => {
      const boxScores = await loadTeamBoxScores(season, team)
      boxScores.forEach(boxScore => {
        const playerStats = boxScore.playerStats.find(ps => ps.PLAYER_ID === playerId)
        if (playerStats) {
          scores.push({ game: boxScore.game, stats: playerStats })
        }
      })
    }))
  }))

  return { player: playerInfo, scores }
}

export function getPlayers(boxScore: BoxScore): PlayerInfo[] {
  return boxScore.playerStats
    .filter(p => p.MIN > 0)
    .map(p => playerMap[p.PLAYER_ID])
    .filter(p => !!p)
}

export async function loadGameBoxScores(gameId: string): Promise<CompleteGameBoxScores | null> {
  const { season, home, away } = gameIdMap[gameId]
  const homeScore = await loadTeamBoxScore(season, home, gameId)
  const awayScore = await loadTeamBoxScore(season, away, gameId)
  if (!homeScore || !awayScore) {
    return null
  }

  return {
    home: { team: home, score: homeScore, players: getPlayers(homeScore) },
    away: { team: away, score: awayScore, players: getPlayers(awayScore) }
  }
}

export async function createTeamMap() {
  const teamMap: TeamMap = {}
  const gameLogs = await loadGameLogs('2017-18')
  gameLogs.forEach((gl: any) => {
    if (!teamMap[gl.TEAM_ABBREVIATION]) {
      teamMap[gl.TEAM_ABBREVIATION] = {
        abbreviation: gl.TEAM_ABBREVIATION,
        id: gl.TEAM_ID,
        name: gl.TEAM_NAME
      }
    }
  })

  await writeJSON(path.join(dataDirectory, 'team_map.json'), teamMap)
}

export async function createPlayerMap() {
  const playerMap: PlayerMap = {}

  await Promise.all(boxScoreSeasons.map(async (season: Season) => {
    await Promise.all(allTeams.map(async (team) => {
      const boxScores = await loadTeamBoxScores(season, team)
      boxScores.forEach(boxScore => {
        boxScore.playerStats.forEach(playerStats => {
          const { PLAYER_ID, PLAYER_NAME, START_POSITION, COMMENT } = playerStats
          if (!playerMap[PLAYER_ID]) {
            let firstName: string, lastName: string
            const nbaStatsPlayer = nbaStatsPlayers.find(p => String(p.playerId) == PLAYER_ID)
            if (nbaStatsPlayer) {
              firstName = nbaStatsPlayer.firstName
              lastName = nbaStatsPlayer.lastName || nbaStatsPlayer.firstName
            } else {
              const firstSpaceIdx = PLAYER_NAME.indexOf(' ')
              if (firstSpaceIdx === -1) {
                firstName = lastName = PLAYER_NAME
              } else {
                firstName = PLAYER_NAME.substr(0, firstSpaceIdx)
                lastName = PLAYER_NAME.substr(firstSpaceIdx + 1)
              }
            }

            playerMap[PLAYER_ID] = {
              firstName, lastName,
              id: PLAYER_ID,
              position: START_POSITION,
              comment: COMMENT,
              teams: {}
            }
          }

          const playerData = playerMap[PLAYER_ID]
          playerData.teams[season] = { ...playerData.teams[season], [team]: true }
        })
      })
    }))
  }))

  await writeJSON(path.join(dataDirectory, 'player_map.json'), playerMap)
}

export async function createGameIdMap() {
  const gameIdMap: GameIdMap = {}

  await Promise.all(gameLogSeasons.map(async (season) => {
    const gameLogs = await loadGameLogs(season)
    gameLogs.forEach(log => {
      const { GAME_ID: id, HOME, OUTCOME, TEAM_ABBREVIATION, OPPONENT_TEAM_ABBREVIATION } = log
      if (!gameIdMap[id]) {
        const home = HOME ? TEAM_ABBREVIATION : OPPONENT_TEAM_ABBREVIATION
        const away = HOME ? OPPONENT_TEAM_ABBREVIATION : TEAM_ABBREVIATION
        const winner = OUTCOME === GameOutcome.Win ? TEAM_ABBREVIATION : OPPONENT_TEAM_ABBREVIATION
        gameIdMap[id] = { id, season, home, away, winner }
      }
    })
  }))

  await writeJSON(path.join(dataDirectory, 'game_id_map.json'), gameIdMap)
}

async function writeJSON(filename: string, data: any) {
  await fs.ensureFile(filename)
  await fs.writeJson(filename, data)
  return filename
}
