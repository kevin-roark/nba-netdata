import { Season, TeamAbbreviation, TeamMap, PlayerMap, GameIdMap, SeasonMap, PlayerInfo, TeamInfo, SeasonInfo, GameInfo } from './types'

export const teamMap: TeamMap = require('../data/team_map.json')
export const playerMap: PlayerMap = require('../data/player_map.json')
export const gameIdMap: GameIdMap = require('../data/game_id_map.json')
export const seasonMap: SeasonMap = require('../data/season_map.json')

export const allTeams = Object.keys(teamMap) as TeamAbbreviation[]

export const gameLogSeasons: Season[] = ['2017-18', '2016-17']
export const boxScoreSeasons: Season[] = ['2017-18', '2016-17']

export function getTeamsInfo(): TeamInfo[] {
  return Object.keys(teamMap).map(k => teamMap[k]).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation))
}

export function getTeamWithAbbreviation(abbr: TeamAbbreviation): TeamInfo {
  return teamMap[abbr]
}

export function getPlayersInfo(): PlayerInfo[] {
  const playerIdMap = playerMap.idMap
  return Object.keys(playerIdMap).map(k => playerIdMap[k]).sort((a, b) => a.simpleId.localeCompare(b.simpleId))
}

export function getPlayerWithSimpleId(simpleId: string): PlayerInfo | null {
  const nbaId = playerMap.simpleIds[simpleId]
  if (!nbaId) {
    return null
  }

  const player = playerMap.idMap[nbaId]
  return player || null
}

export function getSeasonInfo(season: Season): SeasonInfo {
  return seasonMap[season]
}

export function getGameInfo(gameId: string): GameInfo | null {
  return gameIdMap[gameId] || null
}

export function getPlayerGameIds(playerId: string): string[] {
  return Object.keys(gameIdMap)
    .filter(gameId => gameIdMap[gameId].players[playerId])
    .sort((a, b) => gameIdMap[a].date.localeCompare(gameIdMap[b].date))
}
