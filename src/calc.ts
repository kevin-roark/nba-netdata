import { ShotType, Percent, ShotInfo, allShotTypes } from './types'

type ShotSet = {[shotType: string]: { made: number, attempted: number }}

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
      return 2
    case ShotType.ThreePt:
      return 3
  }
}

export function isShotTypeTwoPointer(shotType: ShotType): boolean {
  return shotType === ShotType.LongMidRange || shotType === ShotType.ShortMidRange || shotType === ShotType.Rim
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

interface TSPData {
  freeThrowsMade: number,
  freeThrowsAttempted: number,
  twoPointersMade: number,
  threePointersMade: number,
  fieldGoalsAttempted: number
}

export function calculateTrueShootingPercentage(data: TSPData): Percent {
  const tsa = calculateTrueShootingAttempts(data.fieldGoalsAttempted, data.freeThrowsAttempted)
  const points = data.freeThrowsMade + data.twoPointersMade * 2 + data.threePointersMade * 3
  return points / (2 * tsa)
}

export function shotsToShotSet(shots: ShotInfo[]): ShotSet {
  const set: ShotSet = {}
  allShotTypes.forEach(type => {
    set[type] = { made: 0, attempted: 0 }
  })

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

export function calculateShootingData(shotSet: ShotSet) {
  const { made: freeThrowsMade, attempted: freeThrowsAttempted } = shotSet[ShotType.FreeThrow]
  const { made: threePointersMade, attempted: threePointersAttempted } = shotSet[ShotType.ThreePt]
  const { made: rimTwoPointersMade, attempted: rimTwoPointersAttempted } = shotSet[ShotType.Rim]
  const { made: shortTwoPointersMade, attempted: shortTwoPointersAttempted } = shotSet[ShotType.ShortMidRange]
  const { made: longTwoPointersMade, attempted: longTwoPointersAttempted } = shotSet[ShotType.LongMidRange]
  const twoPointersMade = rimTwoPointersMade + shortTwoPointersMade + longTwoPointersMade
  const twoPointersAttempted = rimTwoPointersAttempted + shortTwoPointersAttempted + longTwoPointersAttempted
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
