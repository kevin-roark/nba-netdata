import * as path from 'path'
import * as fs from 'fs-extra'
import * as moment from 'moment'
import { GameLog, BoxScore, Season, TeamAbbreviation, TeamMap, PlayerMap, GameStats, PlayerBoxScores } from './types'

type DataCategory = 'game_logs' | 'box_scores'

const dataDirectory = path.resolve('data')
const boxScoresDir = path.join(dataDirectory, 'box_scores')
const teamMapPath = path.join(dataDirectory, 'team_map.json')
const playerMapPath = path.join(dataDirectory, 'player_map.json')

export const teamMap = loadTeamMap()
export const playerMap = loadPlayerMap()
export const boxScoreSeasons: Season[] = fs.readdirSync(boxScoresDir).filter(s => s !== '.DS_STORE')

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

export function loadTeamMap(): TeamMap {
  return fs.readJSONSync(teamMapPath)
}

export function loadPlayerMap(): PlayerMap {
  return fs.readJSONSync(playerMapPath)
}

export async function createTeamMap() {
  const teamMap = {}
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

  await writeJSON(teamMapPath, teamMap)
}

export async function createPlayerMap() {
  const playerMap = {}
  const teams = Object.keys(loadTeamMap()) as TeamAbbreviation[]

  await Promise.all(boxScoreSeasons.map(async (season: Season) => {
    await Promise.all(teams.map(async (team) => {
      const boxScores = await loadTeamBoxScores(season, team)
      boxScores.forEach(boxScore => {
        boxScore.playerStats.forEach(playerStats => {
          const { PLAYER_ID, PLAYER_NAME, START_POSITION, COMMENT } = playerStats
          if (!playerMap[PLAYER_ID]) {
            playerMap[PLAYER_ID] = {
              id: PLAYER_ID,
              name: PLAYER_NAME,
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

  await writeJSON(playerMapPath, playerMap)
}

async function writeJSON(filename: string, data: any) {
  await fs.ensureFile(filename)
  await fs.writeJson(filename, data)
  return filename
}
