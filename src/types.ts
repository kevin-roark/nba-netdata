export type Percent = number

export type Season = '2017-18' | '2016-17' | '2015-16'

export enum TeamAbbreviation {
  ATL = 'ATL',
  BKN = 'BKN',
  BOS = 'BOS',
  CHA = 'CHA',
  CHI = 'CHI',
  CLE = 'CLE',
  DAL = 'DAL',
  DEN = 'DEN',
  DET = 'DET',
  GSW = 'GSW',
  HOU = 'HOU',
  IND = 'IND',
  LAC = 'LAC',
  LAL = 'LAL',
  MEM = 'MEM',
  MIA = 'MIA',
  MIL = 'MIL',
  MIN = 'MIN',
  NOP = 'NOP',
  NYK = 'NYK',
  OKC = 'OKC',
  ORL = 'ORL',
  PHI = 'PHI',
  PHX = 'PHX',
  POR = 'POR',
  SAC = 'SAC',
  SAS = 'SAS',
  TOR = 'TOR',
  UTA = 'UTA',
  WAS = 'WAS'
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

export enum GameOutcome {
  Win = 'W',
  Loss = 'L'
}

export enum ShotType {
  Rim = 'rim',
  ShortMidRange = 'shortMidRange',
  LongMidRange = 'longMidRange',
  GenericTwoPt = 'genericTwoPt',
  ThreePt = 'three',
  FreeThrow = 'freeThrow',
}

export const FieldGoal = 'fieldGoal'

export const allShotTypes = [ShotType.Rim, ShotType.ShortMidRange, ShotType.LongMidRange, ShotType.GenericTwoPt, ShotType.ThreePt, ShotType.FreeThrow]

export enum FoulType {
  Shooting = 'shooting',
  Personal = 'personal',
  Offensive = 'offensive',
  Technical = 'technical'
}

export interface ShotInfo {
  shotType: ShotType,
  miss: boolean,
  pointValue: number
}

export interface TeamInfo {
  abbreviation: TeamAbbreviation,
  id: number,
  name: string
}

export interface PlayerInfo {
  id: string,
  simpleId: string,
  firstName: string,
  lastName: string,
  position: string,
  teams: {[season: string]: { team: TeamAbbreviation, startDate: string, endDate: string }[] }
}

export interface GameInfo {
  id: string,
  date: string,
  players: {[playerId: string]: true},
  season: Season,
  home: TeamAbbreviation,
  homePoints: number,
  away: TeamAbbreviation,
  awayPoints: number,
  winner: TeamAbbreviation
}

export interface SeasonInfo {
  startDate: string,
  endDate: string
}

export interface NBAStatsResultSet {
  name: string,
  headers: string[],
  rowSet: any[][]
}

export interface RawNBAStatsData {
  resource: string,
  parameters: {[k: string]: string | number},
  resultSets: NBAStatsResultSet[]
}

export interface NonDerivedBoxScoreStats {
  MIN: number,
  FGM: number,
  FGA: number,
  FG3M: number,
  FG3A: number,
  FTM: number,
  FTA: number,
  OREB: number,
  DREB: number,
  REB: number,
  AST: number,
  STL: number,
  BLK: number,
  TO: number,
  PF: number,
  PTS: number,
  PLUS_MINUS: number
}

export interface BoxScoreStats extends NonDerivedBoxScoreStats {
  FG_PCT: number,
  FG3_PCT: number,
  FT_PCT: number
}

export interface GameBoxScoreStats extends BoxScoreStats {
  GAME_ID: string,
  TEAM_ABBREVIATION: TeamAbbreviation
}

export interface GameLog {
  GAME_ID: string,
  GAME_DATE: string,
  SEASON_ID: Season,
  TEAM_ABBREVIATION: TeamAbbreviation,
  OPPONENT_TEAM_ABBREVIATION: TeamAbbreviation,
  OUTCOME: GameOutcome,
  HOME: boolean,
  VIDEO_AVAILABLE: boolean,
  stats: BoxScoreStats
}

export interface PlayerBoxScoreStats extends GameBoxScoreStats {
  PLAYER_ID: string,
  PLAYER_NAME: string,
  START_POSITION: string,
  COMMENT: string,
}

export interface BoxScore {
  game: GameLog,
  playerStats: PlayerBoxScoreStats[]
}

export interface GameStats {
  game: GameLog,
  stats: BoxScoreStats
}

export interface PlayerBoxScores {
  player: PlayerInfo,
  scores: GameStats[]
}

export interface CompleteGameBoxScores {
  home: { team: TeamAbbreviation, score: BoxScore, players: PlayerInfo[] },
  away: { team: TeamAbbreviation, score: BoxScore, players: PlayerInfo[] }
}

export type TeamMap = {[abbr: string]: TeamInfo }
export interface PlayerMap {
  idMap: { [id: string]: PlayerInfo },
  simpleIds: { [simpleId: string]: string }
}
export type GameIdMap = {[id: string]: GameInfo }
export type SeasonMap = {[season: string]: SeasonInfo }

export type Period = 1 | 2 | 3 | 4

export type ShotSet = {[shotType: string]: { made: number, attempted: number }}
