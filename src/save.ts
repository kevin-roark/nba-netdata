import * as path from 'path'
import * as fs from 'fs-extra'
import * as moment from 'moment'
import { GameLog, Season } from './types'

type DataCategory = 'game_logs'

const dataDirectory = path.resolve('data')

export async function saveSeasonData(data: any, options: { category: DataCategory, season: Season, includeDate?: boolean }) {
  let name: string = options.season
  if (options.includeDate) {
    const date = moment().format('MM-DD-YY')
    name = `${name}__${date}`
  }

  const filename = path.join(dataDirectory, options.category, `${name}.json`)
  await fs.ensureFile(filename)
  await fs.writeJson(filename, data)
  return filename
}
