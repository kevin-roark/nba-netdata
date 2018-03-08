
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

export interface TeamInfo {
  abbreviation: TeamAbbreviation,
  id: number,
  name: string
}

export interface PlayerInfo {
  id: string,
  name: string,
  position: string,
  comment: string
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

export interface BoxScoreStats {
  GAME_ID: string,
  TEAM_ABBREVIATION: TeamAbbreviation,
  MIN: number,
  FGM: number,
  FGA: number,
  FG_PCT: number,
  FG3M: number,
  FG3A: number,
  FG3_PCT: number,
  FTM: number,
  FTA: number,
  FT_PCT: number,
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

export interface PlayerBoxScoreStats extends BoxScoreStats {
  PLAYER_ID: string,
  PLAYER_NAME: string,
  START_POSITION: string,
  COMMENT: string,
}

export interface TeamStartersBenchStats extends BoxScoreStats {
  STARTERS_BENCH: 'Starters' | 'Bench'
}

export interface BoxScore {
  game: GameLog,
  playerStats: PlayerBoxScoreStats[]
}

export interface PlayerBoxScores {
  player: PlayerInfo,
  scores: {
    game: GameLog,
    stats: BoxScoreStats
  }[]
}
