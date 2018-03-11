import { join, resolve } from 'path'
import * as fs from 'fs-extra'
import slugify from 'slugify'
import { GameLog, BoxScore, Season, TeamAbbreviation, TeamMap, PlayerMap, GameIdMap, GameOutcome } from './types'
import { boxScoreSeasons, gameLogSeasons, allTeams } from './data'
import { DataManager, DataCategory } from './data-manager'
import { getPlayerNames } from './util'

const nbaStatsPlayers = require('nba/data/players.json')
const dataDirectory = resolve(`${__dirname}/../data`)

class FsFileGetter {
  getFullPath(path: string) {
    return join(dataDirectory, path)
  }

  async getPathData(path: string) {
    const filepath = this.getFullPath(path)
    return await fs.readJson(filepath)
  }
}

export class FsDataManager extends DataManager {
  constructor() {
    super(new FsFileGetter())
  }

  async saveSeasonData(data: any, category: DataCategory, season: Season) {
    return writeJSON(this.getSeasonPath(category, season), data)
  }

  async saveGameLogs(gameLogs: GameLog[], season: Season) {
    return await this.saveSeasonData(gameLogs, 'game_logs', season)
  }

  async saveTeamSeasonData(data: any, category: DataCategory, season: Season, team: TeamAbbreviation) {
    return writeJSON(this.getTeamSeasonPath(category, season, team), data)
  }

  async saveTeamBoxScores(boxScores: BoxScore[], season: Season, team: TeamAbbreviation) {
    return await this.saveTeamSeasonData(boxScores, 'box_scores', season, team)
  }

  async createTeamMap() {
    const teamMap: TeamMap = {}
    const gameLogs = await this.loadGameLogs('2017-18') || []
    gameLogs.forEach((gl: any) => {
      if (!teamMap[gl.TEAM_ABBREVIATION]) {
        teamMap[gl.TEAM_ABBREVIATION] = {
          abbreviation: gl.TEAM_ABBREVIATION,
          id: gl.TEAM_ID,
          name: gl.TEAM_NAME
        }
      }
    })

    await writeJSON(join(dataDirectory, 'team_map.json'), teamMap)
  }

  async createPlayerMap() {
    const playerMap: PlayerMap = {
      idMap: {},
      simpleIds: {}
    }

    const { idMap, simpleIds } = playerMap

    // Create ID Map
    await Promise.all(boxScoreSeasons.map(async (season: Season) => {
      await Promise.all(allTeams.map(async (team) => {
        const boxScores = await this.loadTeamBoxScores(season, team) || []
        boxScores.forEach(boxScore => { // we leverage that this is a sorted array!
          boxScore.playerStats.forEach(playerStats => {
            const { PLAYER_ID, PLAYER_NAME, START_POSITION } = playerStats
            if (!idMap[PLAYER_ID]) {
              const { firstName, lastName } = getPlayerNames(PLAYER_NAME, PLAYER_ID, nbaStatsPlayers)

              idMap[PLAYER_ID] = {
                firstName, lastName,
                id: PLAYER_ID,
                simpleId: '',
                position: START_POSITION,
                teams: {}
              }
            }

            const playerData = idMap[PLAYER_ID]
            if (!playerData.teams[season]) {
              playerData.teams[season] = []
            }

            const seasonTeams = playerData.teams[season]
            const teamSeasonData = seasonTeams.find(item => item.team === team)
            if (!teamSeasonData) {
              seasonTeams.push({ team, startDate: boxScore.game.GAME_DATE, endDate: boxScore.game.GAME_DATE })
            } else {
              teamSeasonData.endDate = boxScore.game.GAME_DATE
            }
          })
        })
      }))
    }))

    // Create Simple ID Map / Sort player teams
    Object.keys(idMap).forEach(playerId => {
      const { firstName, lastName, teams } = idMap[playerId]
      const nameSlug = slugify(`${firstName} ${lastName}`, { lower: true })

      // we have to increment slugs for players with the same name
      let slug = nameSlug
      for (let i = 1; simpleIds[slug]; i++) {
        slug = `${nameSlug}-${i}`
      }
      simpleIds[slug] = playerId
      idMap[playerId].simpleId = slug

      Object.keys(teams).forEach(teamSeason => {
        teams[teamSeason].sort((a, b) => a.startDate.localeCompare(b.startDate))
      })
    })

    await writeJSON(join(dataDirectory, 'player_map.json'), playerMap)
  }

  async createGameIdMap() {
    const gameIdMap: GameIdMap = {}

    await Promise.all(gameLogSeasons.map(async (season) => {
      const gameLogs = await this.loadGameLogs(season) || []
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

    await writeJSON(join(dataDirectory, 'game_id_map.json'), gameIdMap)
  }
}

async function writeJSON(filename: string, data: any) {
  await fs.ensureFile(filename)
  await fs.writeJson(filename, data)
  return filename
}

export default new FsDataManager()
