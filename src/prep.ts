import * as fs from 'fs-extra'
import { GameLog, RawNBAStatsData } from './types'

export function processGameLogData(gameLogData: RawNBAStatsData): GameLog[] {
  const { headers, rowSet } = gameLogData.resultSets[0]
  const gameLogs = rowSet.map(row => {
    const gl: any = {}
    row.forEach((value, idx) => {
      const key = headers[idx]
      gl[key] = value
    })

    // add some custom data
    gl.VIDEO_AVAILABLE = Boolean(gl.VIDEO_AVAILABLE)

    const matchupComponents = gl.MATCHUP.split(' ')
    gl.OPPONENT_TEAM_ABBREVIATION = matchupComponents[matchupComponents.length - 1]

    return gl as GameLog
  })

  return gameLogs
}
