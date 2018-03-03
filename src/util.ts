import { TeamAbbreviation, TeamInfo } from './types'
import { loadTeamMap } from './data'

const teamMap: {[abbr: string]: TeamInfo } = loadTeamMap()

export function getTeamInfo(team: TeamAbbreviation) {
  return teamMap[team]
}

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const ret: any = {}
  keys.forEach(key => {
    ret[key] = obj[key]
  })
  return ret
}

export const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))
