import * as path from 'path'
import * as fs from 'fs-extra'
import * as moment from 'moment'
import { GameLog, Season, TeamAbbreviation } from './types'

type DataCategory = 'game_logs' | 'box_scores'

const dataDirectory = path.resolve('data')
const teamMapPath = path.join(dataDirectory, 'team_map.json')

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

export function loadTeamMap() {
  return fs.readJSONSync(teamMapPath)
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

  await fs.writeJSON(teamMapPath, teamMap)
}

async function writeJSON(filename: string, data: any) {
  await fs.ensureFile(filename)
  await fs.writeJson(filename, data)
  return filename
}
