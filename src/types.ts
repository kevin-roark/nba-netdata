
export type Season = '2017-18' | '2016-17' | '2015-16'

export interface RawNBAStatsData {
  resource: string,
  parameters: {[k: string]: string | number},
  resultSets: {
    name: string,
    headers: string[],
    rowSet: (string | number)[][]
  }[]
}

export interface GameLog {
  SEASON_ID: Season,
  TEAM_ID: number,
  TEAM_ABBREVIATION: string,
  TEAM_NAME: string,
  GAME_ID: string,
  GAME_DATE: string,
  MATCHUP: string,
  OPPONENT_TEAM_ABBREVIATION: string,
  WL: 'W' | 'L',
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
  TOV: number,
  PF: number,
  PTS: number,
  PLUS_MINUS: number,
  VIDEO_AVAILABLE: boolean,
}
