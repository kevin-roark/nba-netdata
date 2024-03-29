import { PlayerInfo } from './types'

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const ret: any = {}
  keys.forEach(key => {
    ret[key] = obj[key]
  })
  return ret
}

export function mapObject<T, K extends keyof T> (obj: T, mapper: (t: T, k: K) => T[K], ...keys: K[]): Pick<T, K> {
  const mapped: any = {}
  keys.forEach(key => {
    mapped[key] = mapper(obj, key)
  })
  return mapped as Pick<T, K>
}

export function mapObjects<T, K extends keyof T> (objs: T[], mapper: (ts: T[], k: K) => T[K], ...keys: K[]): Pick<T, K> {
  const mapped: any = {}
  keys.forEach(key => {
    mapped[key] = mapper(objs, key)
  })
  return mapped as Pick<T, K>
}

export const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))

// assumes player's name will be in all caps...
export function findPlayerInText (text: string, players: PlayerInfo[]): PlayerInfo | null {
  const nameIndices = players.map((p, idx) => ({ idx, lastNameIndex: text.indexOf(p.lastName), firstNameIndex: text.indexOf(p.firstName) }))
    .filter(i => i.lastNameIndex >= 0 || i.firstNameIndex >= 0)

  const lastNameZeroIndices = nameIndices.filter(i => i.lastNameIndex === 0)
  if (lastNameZeroIndices.length > 0) {
    const withFirstName = lastNameZeroIndices.filter(i => i.firstNameIndex >= 0)
    return withFirstName.length > 0 ? players[withFirstName[0].idx] : players[lastNameZeroIndices[0].idx]
  }

  const lastNameAnyIndices = nameIndices.filter(i => i.lastNameIndex > 0)
  if (lastNameAnyIndices.length > 0) {
    const withFirstName = lastNameZeroIndices.filter(i => i.firstNameIndex >= 0)
    return withFirstName.length > 0 ? players[withFirstName[0].idx] : players[lastNameAnyIndices[0].idx]
  }

  if (nameIndices.length > 0) {
    return players[nameIndices[0].idx]
  }

  return null
}

export function getPlayerNames (name: string, id: string, nbaStatsPlayers: { playerId: string, firstName: string, lastName: string }[]) {
  let firstName: string, lastName: string

  const nbaStatsPlayer = nbaStatsPlayers.find(p => String(p.playerId) == id)
  if (nbaStatsPlayer) {
    firstName = nbaStatsPlayer.firstName
    lastName = nbaStatsPlayer.lastName || nbaStatsPlayer.firstName
  } else {
    const firstSpaceIdx = name.indexOf(' ')
    if (firstSpaceIdx === -1) {
      firstName = lastName = name
    } else {
      firstName = name.substr(0, firstSpaceIdx)
      lastName = name.substr(firstSpaceIdx + 1)
    }
  }

  return { firstName, lastName }
}
