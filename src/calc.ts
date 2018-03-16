import { sum, standardDeviation, interquartileRange } from 'simple-statistics'
import * as moment from 'moment'
import { Moment } from 'moment'
import { FieldGoal, ShotType, Percent, ShotInfo, allShotTypes, NonDerivedBoxScoreStats, ShotSet, BoxScore, GameLog, GameStats, PlayerBoxScoreStats } from './types'
import { mapObjects, mapObject, pick } from './util'

export interface EnhancedShootingStats {
  points: number,
  freeThrowsMade: number, freeThrowsAttempted: number, freeThrowPercentage: number,
  rimMade: number, rimAttempted: number, rimPercentage: number,
  shortMidRangeMade: number, shortMidRangeAttempted: number, shortMidRangePercentage: number,
  longMidRangeMade: number, longMidRangeAttempted: number, longMidRangePercentage: number,
  twoPointersMade: number, twoPointersAttempted: number, twoPointPercentage: number,
  threePointersMade: number, threePointersAttempted: number, threePointPercentage: number,
  fieldGoalsMade: number, fieldGoalsAttempted: number, fieldGoalPercentage: number
  effectiveFieldGoalPercentage: number
  trueShootingPercentage: number
}

export type EnhancedShootingBoxScoreStats = NonDerivedBoxScoreStats & EnhancedShootingStats
export interface EnhancedGameStats {
  game: GameLog & { date: Moment },
  stats: EnhancedShootingBoxScoreStats,
}

export type EnhancedShootingPlayerBoxScoreStats = EnhancedShootingBoxScoreStats & {
  PLAYER_ID: string,
  PLAYER_NAME: string,
  START_POSITION: string,
  COMMENT: string,
}
export interface EnhancedTeamGameStats extends EnhancedGameStats {
  playerStats: EnhancedShootingPlayerBoxScoreStats[]
}

export type ShootingStat = keyof EnhancedShootingStats

export type NumberMapper = (numbers: number[]) => number

// inspired by https://www.cleaningtheglass.com/stats/guide/player_shooting_loc
export function get2PTShotType(distance: number): ShotType | null {
  if (distance < 0) {
    return null
  }

  if (distance <= 4) {
    return ShotType.Rim
  }

  if (distance <= 13.75) {
    return ShotType.ShortMidRange
  }

  return ShotType.LongMidRange
}

export function getShotTypePointValue(shotType: ShotType): number {
  switch (shotType) {
    case ShotType.FreeThrow:
      return 1
    case ShotType.Rim:
    case ShotType.ShortMidRange:
    case ShotType.LongMidRange:
    case ShotType.GenericTwoPt:
      return 2
    case ShotType.ThreePt:
      return 3
  }
}

// from https://www.basketball-reference.com/leagues/NBA_stats.html,
// https://stats.nba.com/teams/shots-general/?sort=FG2_PCT&dir=1, https://www.cleaningtheglass.com/stats/league/shots
const averageShootingPercentages = {
  fieldGoalPercentage: 0.461,
  twoPointPercentage: 0.556,
  threePointPercentage: 0.362,
  freeThrowPercentage: 0.769,
  rimPercentage: 0.634,
  shortMidRangePercentage: 0.394,
  longMidRangePercentage: 0.404,
  effectiveFieldGoalPercentage: 0.522,
}

export function getShotPercentAverage(type: string) {
  const average = averageShootingPercentages[type] || averageShootingPercentages[shotTypeToShootingStat(type as any)] || 0.5
  return average
}

export function getParentShotType(shotType: ShotType): ShotType | null {
  switch (shotType) {
    case ShotType.Rim:
    case ShotType.ShortMidRange:
    case ShotType.LongMidRange:
      return ShotType.GenericTwoPt

    case ShotType.FreeThrow:
    case ShotType.ThreePt:
    case ShotType.FreeThrow:
    case ShotType.GenericTwoPt:
      return null
  }
}

export function shotTypeToShootingStat(type: ShotType | 'fieldGoal'): ShootingStat {
  switch (type) {
    case ShotType.FreeThrow:
      return 'freeThrowPercentage'
    case ShotType.LongMidRange:
      return 'longMidRangePercentage'
    case ShotType.Rim:
      return 'rimPercentage'
    case ShotType.ShortMidRange:
      return 'shortMidRangePercentage'
    case ShotType.ThreePt:
      return 'threePointPercentage'
    case ShotType.GenericTwoPt:
      return 'twoPointPercentage'
    case FieldGoal:
    default:
      return 'fieldGoalPercentage'
  }
}

export function isShotTypeFieldGoal(shotType: ShotType): boolean {
  return shotType !== ShotType.FreeThrow
}

export function calcShotPercentage(makes: number, attempts: number): Percent {
  return attempts ? makes / attempts : NaN
}

export function getShotText(makes: number, attempts: number): string {
  return `${makes} / ${attempts}`
}

export function calcShotPercentageAndText(makes: number, attempts: number) {
  return [calcShotPercentage(makes, attempts), getShotText(makes, attempts)]
}

export function calcEffectiveFieldGoalPercentage(twoPointersMade: number, threePointersMade: number, attempts: number): Percent {
  if (!attempts) {
    return NaN
  }

  const fieldGoalsMade = twoPointersMade + threePointersMade
  return (fieldGoalsMade + 0.5 * threePointersMade) / attempts
}

export function calcTrueShootingAttempts(fieldGoalsAttempted: number, freeThrowsAttempted: number): number {
  return fieldGoalsAttempted + 0.44 * freeThrowsAttempted
}

export function calcTrueShootingPercentage(data: {
  freeThrowsMade: number,
  freeThrowsAttempted: number,
  twoPointersMade: number,
  threePointersMade: number,
  fieldGoalsAttempted: number
}): Percent {
  const tsa = calcTrueShootingAttempts(data.fieldGoalsAttempted, data.freeThrowsAttempted)
  if (!tsa) {
    return NaN
  }

  const points = data.freeThrowsMade + data.twoPointersMade * 2 + data.threePointersMade * 3
  return points / (2 * tsa)
}

const blankShotSet = () => {
  const set: ShotSet = { [FieldGoal]: { made: 0, attempted: 0 }}
  allShotTypes.forEach(type => {
    set[type] = { made: 0, attempted: 0 }
  })
  return set
}

export function shotsToShotSet(shots: ShotInfo[]): ShotSet {
  const set = blankShotSet()
  shots.forEach(({ shotType, miss }) => {
    set[shotType].attempted += 1
    if (!miss) {
      set[shotType].made += 1
    }
  })

  return set
}

export function calcShootingData(shotSet: ShotSet): EnhancedShootingStats {
  const { made: freeThrowsMade, attempted: freeThrowsAttempted } = shotSet[ShotType.FreeThrow]
  const { made: threePointersMade, attempted: threePointersAttempted } = shotSet[ShotType.ThreePt]
  const { made: rimMade, attempted: rimAttempted } = shotSet[ShotType.Rim]
  const { made: shortMidRangeMade, attempted: shortMidRangeAttempted } = shotSet[ShotType.ShortMidRange]
  const { made: longMidRangeMade, attempted: longMidRangeAttempted } = shotSet[ShotType.LongMidRange]
  const { made: genericTwoPointersMade, attempted: genericTwoPointersAttempted } = shotSet[ShotType.GenericTwoPt]
  const twoPointersMade = rimMade + shortMidRangeMade + longMidRangeMade + genericTwoPointersMade
  const twoPointersAttempted = rimAttempted + shortMidRangeAttempted + longMidRangeAttempted + genericTwoPointersAttempted
  const fieldGoalsMade = twoPointersMade + threePointersMade
  const fieldGoalsAttempted = twoPointersAttempted + threePointersAttempted

  const points = freeThrowsMade + twoPointersMade * 2 + threePointersMade * 3

  return {
    points,
    freeThrowsMade, freeThrowsAttempted, freeThrowPercentage: calcShotPercentage(freeThrowsMade, freeThrowsAttempted),
    rimMade, rimAttempted, rimPercentage: calcShotPercentage(rimMade, rimAttempted),
    shortMidRangeMade, shortMidRangeAttempted, shortMidRangePercentage: calcShotPercentage(shortMidRangeMade, shortMidRangeAttempted),
    longMidRangeMade, longMidRangeAttempted, longMidRangePercentage: calcShotPercentage(longMidRangeMade, longMidRangeAttempted),
    twoPointersMade, twoPointersAttempted, twoPointPercentage: calcShotPercentage(twoPointersMade, twoPointersAttempted),
    threePointersMade, threePointersAttempted, threePointPercentage: calcShotPercentage(threePointersMade, threePointersAttempted),
    fieldGoalsMade, fieldGoalsAttempted, fieldGoalPercentage: calcShotPercentage(fieldGoalsMade, fieldGoalsAttempted),
    effectiveFieldGoalPercentage: calcEffectiveFieldGoalPercentage(twoPointersMade, threePointersMade, fieldGoalsAttempted),
    trueShootingPercentage: calcTrueShootingPercentage({ freeThrowsMade, freeThrowsAttempted, twoPointersMade, threePointersMade, fieldGoalsAttempted })
  }
}

export function calcShootingDataFromShots(shots: ShotInfo[]) {
  return calcShootingData(shotsToShotSet(shots))
}

export function calcShootingDataFromBoxScoreStats(boxScore: NonDerivedBoxScoreStats): EnhancedShootingBoxScoreStats {
  const set = blankShotSet()
  set[ShotType.FreeThrow] = { made: boxScore.FTM, attempted: boxScore.FTA }
  set[ShotType.ThreePt] = { made: boxScore.FG3M, attempted: boxScore.FG3A }
  set[ShotType.GenericTwoPt] = { made: boxScore.FGM - boxScore.FG3M, attempted: boxScore.FGA - boxScore.FG3A }

  const enhancedStats = calcShootingData(set)
  return { ...boxScore, ...enhancedStats }
}

export const combineBoxScoreStatsWithShootingData = (stats: NonDerivedBoxScoreStats[]): EnhancedShootingBoxScoreStats =>
  calcShootingDataFromBoxScoreStats(mapBoxScoreStats(stats, sum))

export function calcEnhancedGameStats(gs: GameStats): EnhancedGameStats {
  return {
    stats: calcShootingDataFromBoxScoreStats(gs.stats),
    game: { ...gs.game, date: moment(gs.game.GAME_DATE) }
  }
}

export function calcEnhancedPlayerBoxScoreStats(p: PlayerBoxScoreStats): EnhancedShootingPlayerBoxScoreStats {
  return {
    ...pick(p, 'PLAYER_ID', 'PLAYER_NAME', 'START_POSITION', 'COMMENT'),
    ...calcShootingDataFromBoxScoreStats(p)
  }
}

export function calcEnhancedTeamGameStats(boxScore: BoxScore): EnhancedTeamGameStats {
  return {
    playerStats: boxScore.playerStats.map(calcEnhancedPlayerBoxScoreStats),
    stats: combineBoxScoreStatsWithShootingData(boxScore.playerStats),
    game: { ...boxScore.game, date: moment(boxScore.game.GAME_DATE) }
  }
}

export const mapEnhancedShootingStats = (stats: EnhancedShootingStats[], mapper: NumberMapper): EnhancedShootingStats =>
  mapObjects(stats, (s, k) => mapper(s.map(stat => stat[k])),
    'points', 'freeThrowsMade', 'freeThrowsAttempted', 'freeThrowPercentage',
    'rimMade', 'rimAttempted', 'rimPercentage',
    'shortMidRangeMade', 'shortMidRangeAttempted', 'shortMidRangePercentage',
    'longMidRangeMade', 'longMidRangeAttempted', 'longMidRangePercentage',
    'twoPointersMade', 'twoPointersAttempted', 'twoPointPercentage',
    'threePointersMade', 'threePointersAttempted', 'threePointPercentage',
    'fieldGoalsAttempted', 'fieldGoalsMade', 'fieldGoalPercentage',
    'freeThrowsMade', 'freeThrowsAttempted', 'effectiveFieldGoalPercentage', 'trueShootingPercentage'
  )

export const mapBoxScoreStats = (boxScoreStats: NonDerivedBoxScoreStats[], mapper: NumberMapper): NonDerivedBoxScoreStats =>
  mapObjects(boxScoreStats, (bss, k) => mapper(bss.map(bs => bs[k])),
    'MIN', 'TO', 'PF', 'FGM', 'FGA', 'FG3M', 'FG3A', 'FTM', 'FTA', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'PTS', 'PLUS_MINUS',
  )

export const mapEnhancedShootingBoxScoreStats = (boxScoreStats: EnhancedShootingBoxScoreStats[], mapper: NumberMapper): EnhancedShootingBoxScoreStats => ({
  ...mapEnhancedShootingStats(boxScoreStats, mapper),
  ...mapBoxScoreStats(boxScoreStats, mapper)
})

const nanFilteredStdDev = nanFilter(standardDeviation)
export const getEnhancedShootingStatsStdDev = (stats: EnhancedShootingStats[]) => mapEnhancedShootingStats(stats, nanFilteredStdDev)
export const getEnhancedShootingBoxScoreStatsStdDev = (stats: EnhancedShootingBoxScoreStats[]) => mapEnhancedShootingBoxScoreStats(stats, nanFilteredStdDev)

const nanFilteredIQR = nanFilter(interquartileRange)
export const getEnhancedShootingStatsIQR = (stats: EnhancedShootingStats[]) => mapEnhancedShootingStats(stats, nanFilteredIQR)
export const getEnhancedShootingBoxScoreStatsIQR = (stats: EnhancedShootingBoxScoreStats[]) => mapEnhancedShootingBoxScoreStats(stats, nanFilteredIQR)

function nanFilter(mapper: NumberMapper): NumberMapper {
  return (numbers: number[]) => {
    const cleanNumbers = numbers.filter(n => !isNaN(n))
    return cleanNumbers.length > 0 ? mapper(cleanNumbers) : NaN
  }
}

export function getStatsDiff<T> (stats1: T, stats2: T): T {
  const keys = Object.keys(stats1) as any
  const mapper: any = (_, k) => stats1[k] - stats2[k]
  const diff = mapObject(stats1, mapper, ...keys)
  return diff as any
}

export function mapStatsToString<T, K extends keyof T> (stats: T, mapper: (t: T, k: K) => string): {[key: string]: string} {
  const keys = Object.keys(stats) as any
  return mapObject(stats, mapper as any, ...keys) as any
}
