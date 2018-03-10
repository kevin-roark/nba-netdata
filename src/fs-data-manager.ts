import { join, resolve } from 'path'
import * as fs from 'fs-extra'
import slugify from 'slugify'
import { GameLog, BoxScore, Season, TeamAbbreviation, TeamMap, PlayerMap, GameIdMap, GameOutcome } from './types'
import { boxScoreSeasons, gameLogSeasons, allTeams } from './data'
import { DataManager, DataCategory } from './data-manager'

export const nbaStatsPlayers = require('nba/data/players.json')
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
    const gameLogs = await this.loadGameLogs('2017-18')
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
        const boxScores = await this.loadTeamBoxScores(season, team)
        boxScores.forEach(boxScore => {
          boxScore.playerStats.forEach(playerStats => {
            const { PLAYER_ID, PLAYER_NAME, START_POSITION } = playerStats
            if (!idMap[PLAYER_ID]) {
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

              idMap[PLAYER_ID] = {
                firstName, lastName,
                id: PLAYER_ID,
                simpleId: '',
                position: START_POSITION,
                teams: {}
              }
            }

            const playerData = idMap[PLAYER_ID]
            playerData.teams[season] = { ...playerData.teams[season], [team]: true }
          })
        })
      }))
    }))

    // Create Simple ID Map
    Object.keys(idMap).forEach(playerId => {
      const { firstName, lastName } = idMap[playerId]
      const nameSlug = slugify(`${firstName} ${lastName}`, { lower: true })

      // we have to increment slugs for players with the same name
      let slug = nameSlug
      for (let i = 1; simpleIds[slug]; i++) {
        slug = `${nameSlug}-${i}`
      }
      simpleIds[slug] = playerId
      idMap[playerId].simpleId = slug
    })

    await writeJSON(join(dataDirectory, 'player_map.json'), playerMap)
  }

  async createGameIdMap() {
    const gameIdMap: GameIdMap = {}

    await Promise.all(gameLogSeasons.map(async (season) => {
      const gameLogs = await this.loadGameLogs(season)
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
