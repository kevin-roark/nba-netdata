import { Season, TeamAbbreviation, TeamMap, PlayerMap, GameIdMap, PlayerInfo, TeamInfo } from './types'

export const teamMap: TeamMap = require('../data/team_map.json')
export const playerMap: PlayerMap = require('../data/player_map.json')
export const gameIdMap: GameIdMap = require('../data/game_id_map.json')

export const allTeams = Object.keys(teamMap) as TeamAbbreviation[]

export const gameLogSeasons: Season[] = ['2017-18', '2016-17']
export const boxScoreSeasons: Season[] = ['2017-18']

export function getTeamsInfo(): TeamInfo[] {
  return Object.keys(teamMap).map(k => teamMap[k]).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation))
}

export function getPlayersInfo(): PlayerInfo[] {
  const playerIdMap = playerMap.idMap
  return Object.keys(playerIdMap).map(k => playerIdMap[k]).sort((a, b) => a.simpleId.localeCompare(b.simpleId))
}
