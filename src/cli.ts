#!/usr/bin/env ts-node

import * as program from 'commander'
import { Season, TeamAbbreviation, BoxScore } from './types'
import { fetchGameLog, fetchBoxScore } from './api'
import { loadGameLogs, saveSeasonData, saveTeamData, createPlayerMap, createGameIdMap } from './data'
import { delay } from './util'

export interface CliOptions {
  season: Season
}

const defaultOptions: CliOptions = {
  season: '2017-18'
}

const functionMap: { [key: string]: (options: CliOptions) => any } = {
  saveGameLogs,
  saveBoxScores,
  saveLatestData,
  createPlayerMap,
  createGameIdMap
}

program
  .version('0.1.0')
  .option('-f, --function [value]', 'Function')
  .option('-s, --season [value]', 'Season')
  .parse(process.argv)

main()

async function main() {
  console.log('WELCOME TO NETDATA CLI!')

  const fn = functionMap[program.function]
  if (!fn) {
    console.log(`No valid function given (${program.function})...`)
    return logHelp()
  }

  const options: CliOptions = { ...defaultOptions, ...(program as any) }

  try {
    await fn(options)
    process.exit(0)
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

function logHelp() {
  console.log('Here is some help... run --help for more')
  console.log('Possible functions:', Object.keys(functionMap).join(', '))
}


export async function saveGameLogs({ season }: CliOptions) {
  console.log('Fetching...')
  const gameLogs = await fetchGameLog({ Season: season })

  const filename = await saveSeasonData(gameLogs, { season, category: 'game_logs' })
  console.log('Saved to', filename)
}

export async function saveBoxScores({ season }: CliOptions) {
  const gameLogs = await loadGameLogs(season)
  const gameIds = new Set(gameLogs.map(g => g.GAME_ID))

  const boxScoresByTeam = new Map<TeamAbbreviation, BoxScore[]>()
  for (const GameID of gameIds) {
    console.log(`Fetching game ${GameID}...`)
    const boxScores = await fetchBoxScore({ GameID, season })
    if (boxScores) {
      boxScores.forEach(bs => {
        const list = boxScoresByTeam.get(bs.game.TEAM_ABBREVIATION) || []
        list.push(bs)
        boxScoresByTeam.set(bs.game.TEAM_ABBREVIATION, list)
      })
    }
    await delay(500)
  }

  for (const [team, boxScores] of boxScoresByTeam) {
    const filename = await saveTeamData(boxScores, { season, category: 'box_scores', team })
    console.log(`Saved ${team} to ${filename}`)
  }
}

export async function saveLatestData(options: CliOptions) {
  await saveGameLogs(options)
  await saveBoxScores(options)
  await createPlayerMap()
  await createGameIdMap()
}
