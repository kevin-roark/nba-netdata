import { ShotType, Percent, ShotInfo, allShotTypes, BoxScoreStats, ShotSet } from './types'

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

export function calculateShotPercentage(makes: number, attempts: number): Percent {
  return attempts === 0 ? 0 : makes / attempts
}

export function calculateEffectiveFieldGoalPercentage(twoPointersMade: number, threePointersMade: number, attempts: number): Percent {
  if (attempts === 0) {
    return 0
  }

  const fieldGoalsMade = twoPointersMade + threePointersMade
  return (fieldGoalsMade + 0.5 * threePointersMade) / attempts
}

export function calculateTrueShootingAttempts(fieldGoalsAttempted: number, freeThrowsAttempted: number): number {
  return fieldGoalsAttempted + 0.44 * freeThrowsAttempted
}

export function calculateTrueShootingPercentage(data: {
  freeThrowsMade: number,
  freeThrowsAttempted: number,
  twoPointersMade: number,
  threePointersMade: number,
  fieldGoalsAttempted: number
}): Percent {
  const tsa = calculateTrueShootingAttempts(data.fieldGoalsAttempted, data.freeThrowsAttempted)
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

export function calculateShootingDataFromShots(shots: ShotInfo[]) {
  return calculateShootingData(shotsToShotSet(shots))
}

export function calculateShootingDataFromBoxScoreStats(boxScore: BoxScoreStats) {
  const set = blankShotSet()
  set[ShotType.FreeThrow] = { made: boxScore.FTM, attempted: boxScore.FTA }
  set[ShotType.ThreePt] = { made: boxScore.FG3M, attempted: boxScore.FG3A }
  set[ShotType.UnknownTwoPt] = { made: boxScore.FGM - boxScore.FG3M, attempted: boxScore.FGA - boxScore.FG3A }

  return calculateShootingData(set)
}

export function calculateShootingData(shotSet: ShotSet) {
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
    freeThrowPercentage: calculateShotPercentage(freeThrowsMade, freeThrowsAttempted),
    rimPercentage: calculateShotPercentage(rimTwoPointersMade, rimTwoPointersAttempted),
    shortMidRangePercentage: calculateShotPercentage(shortTwoPointersMade, shortTwoPointersAttempted),
    longMidRangePercentage: calculateShotPercentage(longTwoPointersMade, longTwoPointersAttempted),
    twoPointPercentage: calculateShotPercentage(twoPointersMade, twoPointersAttempted),
    threePointPercentage: calculateShotPercentage(threePointersMade, threePointersAttempted),
    fieldGoalPercentage: calculateShotPercentage(fieldGoalsMade, fieldGoalsAttempted),
    effectiveFieldGoalPercentage: calculateEffectiveFieldGoalPercentage(twoPointersMade, threePointersMade, fieldGoalsAttempted),
    trueShootingPercentage: calculateTrueShootingPercentage({ freeThrowsMade, freeThrowsAttempted, twoPointersMade, threePointersMade, fieldGoalsAttempted })
  }
}
