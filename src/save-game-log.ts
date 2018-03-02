import * as NBA from 'nba'
import { CliOptions } from './cli'
import { processGameLogData } from './prep'
import { saveSeasonData } from './save'

export async function saveGameLog({ season }: CliOptions) {
  const options = {
    Season: season,
    PlayerOrTeam: 'T',
    Sorter: 'DATE',
    Direction: 'ASC'
  }

  console.log('Fetching...')
  const data = await NBA.stats.leagueGameLog(options)

  console.log('Processing...')
  const gameLogs = processGameLogData(data)

  const filename = await saveSeasonData(gameLogs, {
    season,
    category: 'game_logs'
  })
  console.log('Saved to', filename)
}
