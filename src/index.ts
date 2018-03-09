import * as apiM from './api'
import * as calcM from './calc'
import * as cliM from './cli'
import * as dataM from './data'
import * as playByPlayM from './play-by-play'
import * as prepM from './prep'
import * as typesM from './types'

export const api = apiM
export const calc = calcM
export const cli = cliM
export const data = dataM
export const playByPlay = playByPlayM
export const prep = prepM
export const types = typesM

export default {
  api,
  calc,
  cli,
  data,
  playByPlay,
  prep,
  types
}
