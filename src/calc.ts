import { sum, standardDeviation } from 'simple-statistics'
import { ShotType, Percent, ShotInfo, allShotTypes, NonDerivedBoxScoreStats, ShotSet } from './types'
import { mapObjects } from './util'

export interface EnhancedShootingStats {
  freeThrowPercentage: number
  rimPercentage: number
  shortMidRangePercentage: number
  longMidRangePercentage: number
  twoPointPercentage: number
  threePointPercentage: number
  fieldGoalPercentage: number
  effectiveFieldGoalPercentage: number
  trueShootingPercentage: number
}

export type EnhancedShootingBoxScoreStats = NonDerivedBoxScoreStats & EnhancedShootingStats

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
    case ShotType.UnknownTwoPt:
      return 2
    case ShotType.ThreePt:
      return 3
  }
}

export function calcShotPercentage(makes: number, attempts: number): Percent {
  return attempts ? makes / attempts : NaN
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
  const set: ShotSet = {}
  allShotTypes.forEach(type => {
    set[type] = { made: 0, attempted: 0 }
  })
  return set
}

export function shotsToShotSet(shots: ShotInfo[]): ShotSet {
  const set = blankShotSet()
  shots.forEach(({ shotType, miss }) => {
    shots[shotType].attempted += 1
    if (!miss) {
      shots[shotType].made += 1
    }
  })

  return set
}

export function calcShootingDataFromShots(shots: ShotInfo[]) {
  return calcShootingData(shotsToShotSet(shots))
}

export function calcShootingDataFromBoxScoreStats(boxScore: NonDerivedBoxScoreStats): EnhancedShootingBoxScoreStats {
  const set = blankShotSet()
  set[ShotType.FreeThrow] = { made: boxScore.FTM, attempted: boxScore.FTA }
  set[ShotType.ThreePt] = { made: boxScore.FG3M, attempted: boxScore.FG3A }
  set[ShotType.UnknownTwoPt] = { made: boxScore.FGM - boxScore.FG3M, attempted: boxScore.FGA - boxScore.FG3A }

  const enhancedStats = calcShootingData(set)
  return { ...boxScore, ...enhancedStats }
}

export function calcShootingData(shotSet: ShotSet): EnhancedShootingStats {
  const { made: freeThrowsMade, attempted: freeThrowsAttempted } = shotSet[ShotType.FreeThrow]
  const { made: threePointersMade, attempted: threePointersAttempted } = shotSet[ShotType.ThreePt]
  const { made: rimTwoPointersMade, attempted: rimTwoPointersAttempted } = shotSet[ShotType.Rim]
  const { made: shortTwoPointersMade, attempted: shortTwoPointersAttempted } = shotSet[ShotType.ShortMidRange]
  const { made: longTwoPointersMade, attempted: longTwoPointersAttempted } = shotSet[ShotType.LongMidRange]
  const { made: unknownTwoPointersMade, attempted: unknownTwoPointersAttempted } = shotSet[ShotType.UnknownTwoPt]
  const twoPointersMade = rimTwoPointersMade + shortTwoPointersMade + longTwoPointersMade + unknownTwoPointersMade
  const twoPointersAttempted = rimTwoPointersAttempted + shortTwoPointersAttempted + longTwoPointersAttempted + unknownTwoPointersAttempted
  const fieldGoalsMade = twoPointersMade + threePointersMade
  const fieldGoalsAttempted = twoPointersAttempted + threePointersAttempted

  return {
    freeThrowPercentage: calcShotPercentage(freeThrowsMade, freeThrowsAttempted),
    rimPercentage: calcShotPercentage(rimTwoPointersMade, rimTwoPointersAttempted),
    shortMidRangePercentage: calcShotPercentage(shortTwoPointersMade, shortTwoPointersAttempted),
    longMidRangePercentage: calcShotPercentage(longTwoPointersMade, longTwoPointersAttempted),
    twoPointPercentage: calcShotPercentage(twoPointersMade, twoPointersAttempted),
    threePointPercentage: calcShotPercentage(threePointersMade, threePointersAttempted),
    fieldGoalPercentage: calcShotPercentage(fieldGoalsMade, fieldGoalsAttempted),
    effectiveFieldGoalPercentage: calcEffectiveFieldGoalPercentage(twoPointersMade, threePointersMade, fieldGoalsAttempted),
    trueShootingPercentage: calcTrueShootingPercentage({ freeThrowsMade, freeThrowsAttempted, twoPointersMade, threePointersMade, fieldGoalsAttempted })
  }
}

const nanFilteredStdDev = nanFilter(standardDeviation)

export const combineBoxScoreStatsWithShootingData = (stats: NonDerivedBoxScoreStats[]): EnhancedShootingBoxScoreStats =>
  calcShootingDataFromBoxScoreStats(mapBoxScoreStats(stats, sum))

export const getEnhancedShootingStatsStdDev = (stats: EnhancedShootingStats[]) => mapEnhancedShootingStats(stats, nanFilteredStdDev)
export const getEnhancedShootingBoxScoreStatsStdDev = (stats: EnhancedShootingBoxScoreStats[]) => mapEnhancedShootingBoxScoreStats(stats, nanFilteredStdDev)

export const mapEnhancedShootingStats = (stats: EnhancedShootingStats[], mapper: NumberMapper): EnhancedShootingStats =>
  mapObjects(stats, (s, k) => mapper(s.map(stat => stat[k])),
    'freeThrowPercentage', 'rimPercentage', 'shortMidRangePercentage', 'longMidRangePercentage', 'twoPointPercentage', 'threePointPercentage', 'fieldGoalPercentage', 'effectiveFieldGoalPercentage', 'trueShootingPercentage'
  )

export const mapBoxScoreStats = (boxScoreStats: NonDerivedBoxScoreStats[], mapper: NumberMapper): NonDerivedBoxScoreStats =>
  mapObjects(boxScoreStats, (bss, k) => mapper(bss.map(bs => bs[k])),
    'MIN', 'TO', 'PF', 'FGM', 'FGA', 'FG3M', 'FG3A', 'FTM', 'FTA', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'PTS', 'PLUS_MINUS',
  )

export const mapEnhancedShootingBoxScoreStats = (boxScoreStats: EnhancedShootingBoxScoreStats[], mapper: NumberMapper): EnhancedShootingBoxScoreStats => ({
  ...mapEnhancedShootingStats(boxScoreStats, mapper),
  ...mapBoxScoreStats(boxScoreStats, mapper)
})

function nanFilter(mapper: NumberMapper): NumberMapper {
  return (numbers: number[]) => {
    const cleanNumbers = numbers.filter(n => !isNaN(n))
    return cleanNumbers.length > 0 ? mapper(cleanNumbers) : NaN
  }
}
