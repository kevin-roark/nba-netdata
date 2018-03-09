import * as moment from 'moment'
import { Period, CompleteGameBoxScores, TeamAbbreviation, ShotType, FoulType, ShotInfo } from './types'
import { pick, findPlayerInText } from './util'
import { loadGameBoxScores } from './data'
import { get2PTShotType, getShotTypePointValue } from './calc'

const SecondsPerPeriod = 12 * 60

// informed by http://projects.rajivshah.com/sportvu/PBP_NBA_SportVu.html
export enum NBAPlayByPlayEventMessageType {
  Make = 1,
  Miss = 2,
  FreeThrow = 3,
  Rebound = 4,
  Turnover = 5,
  PersonalFoul = 6,
  Violation = 7,
  Substitution = 8,
  Timeout = 9,
  Jumpball = 10,
}

export enum NBAPlayByPlayMessageActionType {
  Jumpshot = 1,
  JumpBankShot = 66,
  PullupJumpShot = 79,
  Layup = 5,
  DrivingLayup = 42,
  FingerRollLayup = 71,
  PutbackLayup = 72,
  Dunk = 7,
  RunningDunk = 50,
  CuttingDunk = 108,
  AlleyOop = 52,
  HookShot = 55,
  DrivingHookShot = 57,
  TurnaroundHookShot = 58,
  FreeThrow11 = 10,
  FreeThrow12 = 11,
  FreeThrow22 = 12,
  BlockSteal = 41,
}

export interface RawNBAPlayByPlayDataPoint {
  gameId: string,
  eventnum: number,
  eventmsgtype: NBAPlayByPlayEventMessageType,
  eventmsgactiontype: NBAPlayByPlayMessageActionType,
  period: Period,
  wctimestring: string, // time of day in format '8:14 PM'
  pctimestring: string, // time remaining in period '12:00' or '11:42'
  homedescription: string | null,
  neutraldescription: string | null,
  visitordescription: string | null,
  score: string | null, // format: 'AWAY_SCORE - HOME_SCORE'
  scoremargin: string | null // format: number that the home team is up / down
}

export interface RawNBAPlayByPlayData {
  playByPlay: RawNBAPlayByPlayDataPoint[]
}

export interface PlayByPlayDataPoint {
  eventnum: number,
  period: Period,
  actualTime: number,
  periodSecondsRemaining: number,
  secondsIntoGame: number,
  awayScore: number,
  homeScore: number,
  eventDescription: string | null,
  eventType: NBAPlayByPlayEventMessageType,
  eventActionType: NBAPlayByPlayMessageActionType,
}

export interface PlayByPlayShotDataPoint extends PlayByPlayDataPoint, ShotInfo {
  eventDescription: string,
  playerId: string,
  team: TeamAbbreviation,
  assistingPlayerName: string | null,
  foulingPlayerName: string | null
}

export interface PlayByPlayData<T extends PlayByPlayDataPoint> {
  gameId: string,
  plays: T[]
}

export type PlayByPlayDataPointGetter<T extends PlayByPlayDataPoint> = (boxScores: CompleteGameBoxScores, data: RawNBAPlayByPlayDataPoint[], index: number) => T | null

export function getMatchingPlays (plays: RawNBAPlayByPlayDataPoint[], index: number) {
  const play = plays[index]
  const matching: number[] = []

  const playDoesMatch = (other: RawNBAPlayByPlayDataPoint) => {
    return other.pctimestring === play.pctimestring
  }

  for (let i = index - 1; i >= 0; i--) {
    if (!playDoesMatch(plays[i])) {
      break
    }
    matching.push(i)
  }
  for (let i = index + 1; i < plays.length; i++) {
    if (!playDoesMatch(plays[i])) {
      break
    }
    matching.push(i)
  }

  return matching
}

export function parseShotDistance(shotDescription: string): number {
  const distanceMatch = shotDescription.match(/(\d+)'/)
  if (!distanceMatch) {
    return -1
  }

  return Number(distanceMatch[1])
}

export function parseAssistInfo(shotDescription: string) {
  const assistMatch = shotDescription.match(/\((\w+) (\d+) AST\)/)
  if (!assistMatch) {
    return null
  }

  const name = assistMatch[1]
  const count = Number(assistMatch[2])
  return { name, count }
}

export function parseShotInfo(data: PlayByPlayDataPoint) {
  const { eventDescription: description, eventType } = data
  if (!description) {
    return null
  }

  let shotType: ShotType | null = null
  if (description.includes('Free Throw')) {
    shotType = ShotType.FreeThrow
  }
  else if (description.includes('3PT')) {
    shotType = ShotType.ThreePt
  }
  else if (eventType === NBAPlayByPlayEventMessageType.Make || eventType === NBAPlayByPlayEventMessageType.Miss) {
    const distance = parseShotDistance(description)
    shotType = get2PTShotType(distance)
  }

  if (!shotType) {
    return null
  }

  const miss = description.includes('MISS') || eventType === NBAPlayByPlayEventMessageType.Miss
  const pointValue = miss ? 0 : getShotTypePointValue(shotType)

  const assistInfo = parseAssistInfo(description)
  const assistingPlayerName = assistInfo ? assistInfo.name : null

  return { shotType, miss, pointValue, assistingPlayerName }
}

export function parseFoulInfo(data: PlayByPlayDataPoint) {
  const { eventDescription, eventType } = data
  const foul = eventType === NBAPlayByPlayEventMessageType.PersonalFoul
  if (!foul || !eventDescription) {
    return null
  }

  let foulType: FoulType | null = null
  let foulingPlayer: string | null = null

  const foulTypeMatch = eventDescription.match(/(\w+) (\w+).FOUL/)
  if (foulTypeMatch) {
    foulingPlayer = foulTypeMatch[1]

    const type = foulTypeMatch[2]
    if (type === 'P') {
      foulType = FoulType.Personal
    } else if (type === 'S') {
      foulType = FoulType.Shooting
    }
  }

  return { foulType, foulingPlayer }
}

export function getPlayByPlayDataPoint(boxScores: CompleteGameBoxScores, points: RawNBAPlayByPlayDataPoint[], index: number): PlayByPlayDataPoint {
  const data = points[index]
  const { eventmsgtype: eventType, eventmsgactiontype: eventActionType } = data

  const actualTime = moment(`${boxScores.home.score.game.GAME_DATE} ${data.wctimestring}`, 'YYYY-MM-DD H:mm A')
  const [periodMinutes, periodSeconds] = data.pctimestring.split(':')
  const periodSecondsRemaining = 60 * Number(periodMinutes) + Number(periodSeconds)
  const secondsIntoGame = (data.period - 1) * SecondsPerPeriod + (SecondsPerPeriod - periodSecondsRemaining)

  // not every event includes score so sometimes we need to go back in time
  let awayScore = 0
  let homeScore = 0
  for (let i = index; i >= 0 && awayScore === 0 && homeScore === 0; i--) {
    const d = points[i]
    if (d.score) {
      const [as, hs] = d.score.split(' - ')
      awayScore = Number(as)
      homeScore = Number(hs)
    }
  }

  const eventDescription = data.neutraldescription || data.homedescription || data.visitordescription

  return {
    ...pick(data, 'eventnum', 'period'),
    periodSecondsRemaining, secondsIntoGame, awayScore, homeScore, eventDescription, eventType, eventActionType,
    actualTime: actualTime.valueOf(),
  }
}

export function getPlayByPlayShotDataPoint(boxScores: CompleteGameBoxScores, points: RawNBAPlayByPlayDataPoint[], index: number): PlayByPlayShotDataPoint | null {
  const { home, away } = boxScores

  const point = getPlayByPlayDataPoint(boxScores, points, index)
  const { eventDescription } = point
  if (!eventDescription) {
    return null
  }

  const shotInfo = parseShotInfo(point)
  if (!shotInfo) {
    return null
  }

  const player = findPlayerInText(eventDescription, home.players.concat(away.players))
  if (!player) {
    return null
  }

  const playerId = player.id
  const playerIsHome = !!home.players.find(p => p.id === playerId)
  const team = playerIsHome ? home.team : away.team

  let foulingPlayerName: string | null = null
  if (!shotInfo.miss) {
    const matchingPlays = getMatchingPlays(points, index).map(mi => getPlayByPlayDataPoint(boxScores, points, mi))
    matchingPlays.forEach(p => {
      const foulInfo = parseFoulInfo(p)
      if (foulInfo && foulInfo.foulType === FoulType.Shooting) {
        foulingPlayerName = foulInfo.foulingPlayer
      }
    })
  }

  return { ...point, ...shotInfo, eventDescription, playerId, team, foulingPlayerName }
}

export async function getPlayByPlayData<T extends PlayByPlayDataPoint>(data: RawNBAPlayByPlayData, getter: PlayByPlayDataPointGetter<T>): Promise<PlayByPlayData<T>> {
  const gameId = data.playByPlay[0].gameId
  const gameBoxScores = await loadGameBoxScores(gameId)
  const points = data.playByPlay.map((d, i) => getter(gameBoxScores!, data.playByPlay, i))
  const plays = points.filter(p => !!p) as T[]

  return { gameId, plays }
}

export async function getPlayByPlayShotData(data: RawNBAPlayByPlayData): Promise<PlayByPlayData<PlayByPlayShotDataPoint>> {
  return await getPlayByPlayData(data, getPlayByPlayShotDataPoint)
}
